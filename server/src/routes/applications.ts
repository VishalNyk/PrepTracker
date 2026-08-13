import { Router, Request, Response } from 'express';
import { PrismaClient, ApplicationStatus } from '@prisma/client';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes in this router
router.use(requireAuth);

// GET /api/applications - Fetch applications with optional status and tier filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, tier } = req.query;
    const userId = (req as any).userId;
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status as ApplicationStatus;
    }
    if (tier) {
      where.tier = parseInt(tier as string, 10);
    }

    const applications = await prisma.application.findMany({
      where,
      orderBy: { appliedDate: 'desc' }
    });

    res.json(applications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/applications - Create application
router.post('/', async (req: Request, res: Response) => {
  try {
    const { companyName, role, tier, status, appliedDate, notes } = req.body;
    const userId = (req as any).userId;
    
    if (!companyName || !role || !appliedDate) {
      return res.status(400).json({ error: 'Missing required fields: companyName, role, appliedDate' });
    }

    const application = await prisma.application.create({
      data: {
        companyName,
        role,
        tier: tier !== undefined ? parseInt(tier, 10) : 1,
        status: (status as ApplicationStatus) || ApplicationStatus.APPLIED,
        appliedDate: new Date(appliedDate),
        lastUpdate: new Date(),
        notes: notes || null,
        userId: userId || null
      }
    });

    res.status(201).json(application);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/applications/:id - Update application details
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = (req as any).userId;
    const { companyName, role, tier, status, appliedDate, notes } = req.body;

    if (userId) {
      const existing = await prisma.application.findFirst({ where: { id, userId } });
      if (!existing) {
        return res.status(403).json({ error: 'Forbidden: You do not own this application' });
      }
    }

    const updateData: any = {
      lastUpdate: new Date() // auto-update timestamp
    };

    if (companyName !== undefined) updateData.companyName = companyName;
    if (role !== undefined) updateData.role = role;
    if (tier !== undefined) updateData.tier = parseInt(tier, 10);
    if (status !== undefined) updateData.status = status as ApplicationStatus;
    if (appliedDate !== undefined) updateData.appliedDate = new Date(appliedDate);
    if (notes !== undefined) updateData.notes = notes;

    const application = await prisma.application.update({
      where: { id },
      data: updateData
    });

    res.json(application);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/applications/:id - Delete application
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = (req as any).userId;

    if (userId) {
      const existing = await prisma.application.findFirst({ where: { id, userId } });
      if (!existing) {
        return res.status(403).json({ error: 'Forbidden: You do not own this application' });
      }
    }

    await prisma.application.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
