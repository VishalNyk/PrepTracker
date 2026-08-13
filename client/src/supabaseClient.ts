import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Safely detect placeholder credentials to prevent Supabase SDK from crashing on invalid URLs
const isPlaceholder = 
  !rawUrl || 
  !rawKey ||
  rawUrl.includes('placeholder') || 
  rawUrl.includes('palceholder') ||
  rawUrl.includes('your_supabase') || 
  rawUrl.includes('your-project-id') ||
  rawKey.includes('placeholder') || 
  rawKey.includes('palceholder') ||
  rawKey.includes('your_supabase') ||
  rawKey.includes('your-anon-key');

const supabaseUrl = isPlaceholder ? 'https://placeholder.supabase.co' : rawUrl;
const supabaseAnonKey = isPlaceholder ? 'placeholder' : rawKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
