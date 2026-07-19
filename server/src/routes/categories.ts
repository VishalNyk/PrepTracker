import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/categories - Fetch all custom categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.topicCategory.findMany({
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
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.topicCategory.create({
      data: { name: name.trim() }
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
