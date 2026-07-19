import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import logsRouter from './routes/logs';
import milestonesRouter from './routes/milestones';
import topicsRouter from './routes/topics';
import categoriesRouter from './routes/categories';
import applicationsRouter from './routes/applications';
import analyticsRouter from './routes/analytics';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in local dev; can narrow down if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/logs', logsRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/analytics', analyticsRouter);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
app.listen(port, () => {
  console.log(`[PrepTracker Server] Running on http://localhost:${port}`);
});
