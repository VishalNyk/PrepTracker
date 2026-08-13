import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import logsRouter from './routes/logs';
import milestonesRouter from './routes/milestones';
import topicsRouter from './routes/topics';
import categoriesRouter from './routes/categories';
import applicationsRouter from './routes/applications';
import analyticsRouter from './routes/analytics';
import authRouter from './routes/auth';

// Load environment variables based on NODE_ENV (default to local)
import path from 'path';
const nodeEnv = process.env.NODE_ENV || 'local';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in local dev; can narrow down if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/logs', logsRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/auth', authRouter);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
app.listen(port, () => {
  console.log(`[PrepTracker Server] Running on http://localhost:${port}`);
});
