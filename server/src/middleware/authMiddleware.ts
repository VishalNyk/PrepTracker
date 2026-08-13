import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret || secret.includes('placeholder') || secret.includes('palceholder') || secret === '') {
    // Local development mode fallback: bypass JWT signature checks
    (req as any).userId = null;
    (req as any).user = null;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the Supabase JWT signature (HS256)
    const decoded = jwt.verify(token, secret) as any;
    
    // Supabase places the auth user ID in the 'sub' claim
    const supabaseUserId = decoded.sub;
    const email = decoded.email;
    const name = decoded.user_metadata?.full_name || decoded.name || null;

    if (!supabaseUserId) {
      return res.status(401).json({ error: 'Invalid token payload: user ID not found.' });
    }

    // Sync user with our database
    let user = await prisma.user.findUnique({
      where: { id: supabaseUserId }
    });

    if (!user) {
      // First-time login: sync profile details into our database
      user = await prisma.user.create({
        data: {
          id: supabaseUserId,
          email: email,
          name: name
        }
      });
    }

    // Attach user information to the request
    (req as any).userId = supabaseUserId;
    (req as any).user = user;

    next();
  } catch (error: any) {
    console.error('[Auth Middleware] Verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
