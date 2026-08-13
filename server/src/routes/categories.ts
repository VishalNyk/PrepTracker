import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware
router.use(requireAuth);

// GET /api/categories - Fetch custom & global categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const where: any = userId ? {
      OR: [
        { userId: userId },
        { userId: null }
      ]
    } : {};

    const categories = await prisma.topicCategory.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/categories - Create a new custom category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = (req as any).userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.topicCategory.create({
      data: { 
        name: name.trim(),
        userId: userId || null
      }
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
