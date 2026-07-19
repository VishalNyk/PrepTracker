import { Router, Request, Response } from 'express';
import { PrismaClient, Category } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const VALID_CATEGORIES: Category[] = [
  'DSA',
  'SYSTEM_DESIGN',
  'AI_AGENTIC',
  'PROJECT',
  'APPLICATIONS',
  'CLOUD_NATIVE_COMPUTING',
  'OTHER'
];
const VALID_CATEGORY_SET = new Set<string>(VALID_CATEGORIES);
const isValidCategory = (value: unknown): value is Category => typeof value === 'string' && VALID_CATEGORY_SET.has(value);

// GET /api/logs - List logs with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to, category } = req.query;
    const where: any = {};

    if (category) {
      const categoryValue = Array.isArray(category) ? category[0] : category;
      if (!isValidCategory(categoryValue)) {
        return res.status(400).json({ error: `Invalid category filter. Supported categories: ${Array.from(VALID_CATEGORIES).join(', ')}` });
      }
      where.category = categoryValue as Category;
    }

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from as string);
      }
      if (to) {
        where.date.lte = new Date(to as string);
      }
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100 // Limit for safety, but table requests 30
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/logs/heatmap - Heatmap aggregation per day
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const yearStr = req.query.year as string;
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const logs = await prisma.activityLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Aggregate in memory
    const dailyData: { [key: string]: { totalMinutes: number; categories: { [cat: string]: number } } } = {};

    logs.forEach(log => {
      // Use UTC ISO string to represent date as YYYY-MM-DD consistently
      const dateKey = new Date(log.date).toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { totalMinutes: 0, categories: {} };
      }
      dailyData[dateKey].totalMinutes += log.durationMin;
      dailyData[dateKey].categories[log.category] = (dailyData[dateKey].categories[log.category] || 0) + log.durationMin;
    });

    const result = Object.entries(dailyData).map(([date, data]) => {
      // Find top category
      let topCategory = 'None';
      let maxMin = 0;
      Object.entries(data.categories).forEach(([cat, min]) => {
        if (min > maxMin) {
          maxMin = min;
          topCategory = cat;
        }
      });

      return {
        date,
        totalMinutes: data.totalMinutes,
        topCategory,
      };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/logs - Create log entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const { date, category, topic, durationMin, notes } = req.body;
    
    if (!date || !category || durationMin === undefined) {
      return res.status(400).json({ error: 'Missing required fields: date, category, durationMin' });
    }

    if (!isValidCategory(category)) {
      return res.status(400).json({ error: `Invalid category. Supported categories: ${Array.from(VALID_CATEGORIES).join(', ')}` });
    }

    const log = await prisma.activityLog.create({
      data: {
        date: new Date(date),
        category: category as Category,
        topic: topic || null,
        durationMin: parseInt(durationMin, 10),
        notes: notes || null
      }
    });

    res.status(201).json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/logs/:id - Update log entry
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { date, category, topic, durationMin, notes } = req.body;

    if (category !== undefined && !isValidCategory(category)) {
      return res.status(400).json({ error: `Invalid category. Supported categories: ${Array.from(VALID_CATEGORIES).join(', ')}` });
    }

    const log = await prisma.activityLog.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        category: category ? (category as Category) : undefined,
        topic: topic !== undefined ? topic : undefined,
        durationMin: durationMin !== undefined ? parseInt(durationMin, 10) : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });

    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/logs/:id - Delete log entry
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.activityLog.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
