import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Safely detect placeholder credentials to support local guest mode bypass
const isPlaceholder = 
  !supabaseUrl || 
  !supabaseAnonKey ||
  supabaseUrl.includes('placeholder') || 
  supabaseUrl.includes('palceholder') ||
  supabaseAnonKey.includes('placeholder') ||
  supabaseAnonKey.includes('palceholder') ||
  supabaseUrl.includes('your_supabase') ||
  supabaseAnonKey.includes('your_supabase');

// Initialize supabase client if configured, otherwise remain null for local guest mode
const supabase = isPlaceholder ? null : createClient(supabaseUrl, supabaseAnonKey);

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Check for local dev bypass FIRST
  if (!supabase) {
    (req as any).userId = null;
    (req as any).user = null;
    return next();
  }

  // 2. Only enforce authorization if JWT is configured
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify using Supabase SDK directly (supports both HS256 and ES256 automatically!)
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('[Auth Middleware] Verification failed:', error?.message || 'No user found');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const supabaseUserId = user.id;
    const email = user.email;
    const name = user.user_metadata?.full_name || null;

    if (!supabaseUserId) {
      return res.status(401).json({ error: 'Invalid token payload: user ID not found.' });
    }

    // Sync user with our database
    let localUser = await prisma.user.findUnique({
      where: { id: supabaseUserId }
    });

    if (!localUser) {
      localUser = await prisma.user.create({
        data: {
          id: supabaseUserId,
          email: email || '',
          name: name
        }
      });
    }

    // Attach user information to the request
    (req as any).userId = supabaseUserId;
    (req as any).user = localUser;

    next();
  } catch (error: any) {
    console.error('[Auth Middleware] Exception:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
