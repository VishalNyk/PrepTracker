import { Router, Request, Response } from 'express';
import { PrismaClient, MasteryLevel } from '@prisma/client';
import { requireAuth } from '../middleware/authMiddleware';

interface TopicNotePayload {
  id?: number;
  title?: string;
  content?: string | null;
}

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes in this router
router.use(requireAuth);

// GET /api/topics - Fetch topics with optional category filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const userId = (req as any).userId;
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }
    if (category) {
      where.category = category as string;
    }

    const topics = await prisma.topic.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        topicNotes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json(topics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/topics - Create topic
router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, name } = req.body;
    const userId = (req as any).userId;

    if (!category || !name) {
      return res.status(400).json({ error: 'Missing required fields: category, name' });
    }

    const topic = await prisma.topic.create({
      data: {
        category: category as string,
        name,
        masteryLevel: MasteryLevel.NOT_STARTED,
        userId: userId || null
      }
    });

    res.status(201).json(topic);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/topics/:id - Update topic details
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = (req as any).userId;
    const { name, masteryLevel, notes, lastPracticed } = req.body;

    if (userId) {
      const existing = await prisma.topic.findFirst({ where: { id, userId } });
      if (!existing) {
        return res.status(403).json({ error: 'Forbidden: You do not own this topic' });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (masteryLevel) updateData.masteryLevel = masteryLevel as MasteryLevel;
    if (notes !== undefined) updateData.notes = notes;
    if (lastPracticed !== undefined) {
      updateData.lastPracticed = lastPracticed ? new Date(lastPracticed) : null;
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: updateData,
      include: {
        topicNotes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json(topic);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/topics/:id/notes - Create a new note card for a topic
router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const userId = (req as any).userId;
    const payload = req.body as TopicNotePayload;
    const title = (payload.title || '').trim() || `Note ${Date.now()}`;

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (userId && topic.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this topic' });
    }

    const note = await prisma.topicNote.create({
      data: {
        topicId,
        title,
        content: payload.content ?? ''
      }
    });

    res.status(201).json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/topics/:id/notes/:noteId - Update a note card
router.put('/:id/notes/:noteId', async (req: Request, res: Response) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const noteId = parseInt(req.params.noteId, 10);
    const userId = (req as any).userId;
    const payload = req.body as TopicNotePayload;

    const existing = await prisma.topicNote.findFirst({
      where: {
        id: noteId,
        topicId,
        ...(userId ? { topic: { userId } } : {})
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = await prisma.topicNote.update({
      where: { id: noteId },
      data: {
        title: payload.title !== undefined ? payload.title.trim() || existing.title : existing.title,
        content: payload.content !== undefined ? payload.content : existing.content
      }
    });

    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/topics/:id/notes/:noteId - Delete a note card
router.delete('/:id/notes/:noteId', async (req: Request, res: Response) => {
  try {
    const topicId = parseInt(req.params.id, 10);
    const noteId = parseInt(req.params.noteId, 10);
    const userId = (req as any).userId;

    const existing = await prisma.topicNote.findFirst({
      where: {
        id: noteId,
        topicId,
        ...(userId ? { topic: { userId } } : {})
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.topicNote.delete({ where: { id: noteId } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/topics/:id - Delete topic
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = (req as any).userId;

    if (userId) {
      const existing = await prisma.topic.findFirst({ where: { id, userId } });
      if (!existing) {
        return res.status(403).json({ error: 'Forbidden: You do not own this topic' });
      }
    }

    await prisma.topic.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
