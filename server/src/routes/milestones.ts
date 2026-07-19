import { Router, Request, Response } from 'express';
import { PrismaClient, Category, MilestoneStatus } from '@prisma/client';

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

// Helper function to update milestone progress percentage and status
async function updateMilestoneProgress(milestoneId: number) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { tasks: true }
  });
  
  if (!milestone) return;

  const totalTasks = milestone.tasks.length;
  if (totalTasks === 0) {
    // If no tasks, keep progress at 0 or current status unless manually set
    return;
  }

  const completedTasks = milestone.tasks.filter(t => t.isDone).length;
  const progressPct = Math.round((completedTasks / totalTasks) * 100);
  
  let status = milestone.status;
  if (progressPct === 100) {
    status = MilestoneStatus.DONE;
  } else if (progressPct > 0) {
    status = MilestoneStatus.IN_PROGRESS;
  } else {
    status = MilestoneStatus.NOT_STARTED;
  }

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { progressPct, status }
  });
}

// GET /api/milestones - List milestones with tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const milestones = await prisma.milestone.findMany({
      include: {
        tasks: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { targetDate: 'asc' }
    });
    res.json(milestones);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/milestones - Create milestone
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, category, targetDate } = req.body;
    if (!title || !category || !targetDate) {
      return res.status(400).json({ error: 'Missing required fields: title, category, targetDate' });
    }

    if (!isValidCategory(category)) {
      return res.status(400).json({ error: `Invalid category. Supported categories: ${Array.from(VALID_CATEGORIES).join(', ')}` });
    }

    const milestone = await prisma.milestone.create({
      data: {
        title,
        category: category as Category,
        targetDate: new Date(targetDate),
        status: MilestoneStatus.NOT_STARTED,
        progressPct: 0
      },
      include: { tasks: true }
    });

    res.status(201).json(milestone);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/milestones/:id - Update milestone fields
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, category, targetDate, status, progressPct } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (category) {
      if (!isValidCategory(category)) {
        return res.status(400).json({ error: `Invalid category. Supported categories: ${Array.from(VALID_CATEGORIES).join(', ')}` });
      }
      updateData.category = category as Category;
    }
    if (targetDate) updateData.targetDate = new Date(targetDate);
    if (status) updateData.status = status as MilestoneStatus;
    if (progressPct !== undefined) updateData.progressPct = parseInt(progressPct, 10);

    const milestone = await prisma.milestone.update({
      where: { id },
      data: updateData,
      include: { tasks: true }
    });

    // Recalculate progress if not manually overriding
    if (progressPct === undefined) {
      await updateMilestoneProgress(id);
      const updatedMilestone = await prisma.milestone.findUnique({
        where: { id },
        include: { tasks: { orderBy: { order: 'asc' } } }
      });
      return res.json(updatedMilestone);
    }

    res.json(milestone);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/milestones/:id - Delete milestone
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.milestone.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/milestones/:id/tasks - Add sub-task
router.post('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Missing required field: title' });
    }

    // Get current max order
    const maxOrderTask = await prisma.milestoneTask.findFirst({
      where: { milestoneId },
      orderBy: { order: 'desc' }
    });
    const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const task = await prisma.milestoneTask.create({
      data: {
        milestoneId,
        title,
        isDone: false,
        order
      }
    });

    // Update milestone progress percentage
    await updateMilestoneProgress(milestoneId);

    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/milestones/:id/tasks/:taskId - Toggle or edit sub-task
router.put('/:id/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);
    const { isDone, order, title } = req.body;

    const updateData: any = {};
    if (isDone !== undefined) updateData.isDone = isDone;
    if (order !== undefined) updateData.order = parseInt(order, 10);
    if (title !== undefined) updateData.title = title;

    const task = await prisma.milestoneTask.update({
      where: { id: taskId, milestoneId },
      data: updateData
    });

    // Recalculate milestone progress percentage
    await updateMilestoneProgress(milestoneId);

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/milestones/:id/tasks/:taskId - Delete sub-task
router.delete('/:id/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const milestoneId = parseInt(req.params.id, 10);
    const taskId = parseInt(req.params.taskId, 10);

    await prisma.milestoneTask.delete({
      where: { id: taskId, milestoneId }
    });

    // Recalculate milestone progress percentage
    await updateMilestoneProgress(milestoneId);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
