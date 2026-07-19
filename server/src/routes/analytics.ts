import { Router, Request, Response } from 'express';
import { PrismaClient, Category, MilestoneStatus, ApplicationStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Helper to calculate streaks
function calculateStreaks(dates: string[]): { currentStreakDays: number; longestStreakDays: number } {
  if (dates.length === 0) return { currentStreakDays: 0, longestStreakDays: 0 };
  
  // Today's date string in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Check if today or yesterday was practiced
  const hasToday = dates.includes(todayStr);
  const hasYesterday = dates.includes(yesterdayStr);
  
  let currentStreakDays = 0;
  if (hasToday || hasYesterday) {
    let currentRef = hasToday ? new Date(todayStr) : new Date(yesterdayStr);
    currentStreakDays = 1;
    
    while (true) {
      const nextDay = new Date(currentRef);
      nextDay.setDate(nextDay.getDate() - 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      if (dates.includes(nextDayStr)) {
        currentStreakDays++;
        currentRef = nextDay;
      } else {
        break;
      }
    }
  }

  // Longest streak
  const sortedDates = [...new Set(dates)].sort().map(d => new Date(d));
  let longestStreakDays = 1;
  let runningStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const diffTime = sortedDates[i].getTime() - sortedDates[i-1].getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      runningStreak++;
      if (runningStreak > longestStreakDays) {
        longestStreakDays = runningStreak;
      }
    } else if (diffDays > 1) {
      runningStreak = 1;
    }
  }

  return { 
    currentStreakDays, 
    longestStreakDays: Math.max(longestStreakDays, currentStreakDays) 
  };
}

// GET /api/analytics/summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    // 1. Streaks
    const allLogs = await prisma.activityLog.findMany({
      select: { date: true }
    });
    
    const uniqueDates = allLogs.map(log => {
      return new Date(log.date).toISOString().split('T')[0];
    });
    
    const { currentStreakDays, longestStreakDays } = calculateStreaks(uniqueDates);

    // 2. All-time hours
    const totalMinutesAllTime = await prisma.activityLog.aggregate({
      _sum: { durationMin: true }
    });
    const totalHoursAllTime = Math.round(((totalMinutesAllTime._sum.durationMin || 0) / 60) * 10) / 10;

    // 3. This week's hours
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 Sunday, 1 Monday...
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const thisWeeksLogs = await prisma.activityLog.findMany({
      where: {
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    });

    const totalMinutesThisWeek = thisWeeksLogs.reduce((sum, log) => sum + log.durationMin, 0);
    const totalHoursThisWeek = Math.round((totalMinutesThisWeek / 60) * 10) / 10;

    // 4. Hours by category this week
    const hoursByCategoryThisWeek: { [key in Category]: number } = {
      DSA: 0,
      SYSTEM_DESIGN: 0,
      AI_AGENTIC: 0,
      PROJECT: 0,
      APPLICATIONS: 0,
      CLOUD_NATIVE_COMPUTING: 0,
      OTHER: 0
    };

    thisWeeksLogs.forEach(log => {
      const hours = log.durationMin / 60;
      hoursByCategoryThisWeek[log.category] = Math.round((hoursByCategoryThisWeek[log.category] + hours) * 10) / 10;
    });

    // 5. Milestones due this week
    const milestonesDueThisWeek = await prisma.milestone.count({
      where: {
        targetDate: {
          gte: startOfWeek,
          lte: endOfWeek
        },
        status: {
          not: MilestoneStatus.DONE
        }
      }
    });

    // 6. Applications in pipeline
    const applicationsInPipeline = await prisma.application.count({
      where: {
        status: {
          in: [
            ApplicationStatus.APPLIED,
            ApplicationStatus.OA,
            ApplicationStatus.INTERVIEW,
            ApplicationStatus.OFFER
          ]
        }
      }
    });

    res.json({
      currentStreakDays,
      longestStreakDays,
      totalHoursAllTime,
      totalHoursThisWeek,
      hoursByCategoryThisWeek,
      milestonesDueThisWeek,
      applicationsInPipeline
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/weekly?weeks=12
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const weeks = parseInt(req.query.weeks as string, 10) || 12;
    
    // Find start of current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - distanceToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    // Compute overall start date
    const overallStartDate = new Date(currentWeekStart);
    overallStartDate.setDate(currentWeekStart.getDate() - ((weeks - 1) * 7));

    const logs = await prisma.activityLog.findMany({
      where: {
        date: {
          gte: overallStartDate
        }
      }
    });

    const weeklyData = [];
    for (let i = 0; i < weeks; i++) {
      const wStart = new Date(overallStartDate);
      wStart.setDate(overallStartDate.getDate() + (i * 7));
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);

      const logsInWeek = logs.filter(log => {
        const d = new Date(log.date);
        return d >= wStart && d <= wEnd;
      });

      const byCategory: { [key in Category]: number } = {
        DSA: 0,
        SYSTEM_DESIGN: 0,
        AI_AGENTIC: 0,
        PROJECT: 0,
        APPLICATIONS: 0,
        CLOUD_NATIVE_COMPUTING: 0,
        OTHER: 0
      };

      let totalMin = 0;
      logsInWeek.forEach(log => {
        totalMin += log.durationMin;
        byCategory[log.category] += log.durationMin;
      });

      // Convert category minutes to hours (rounded to 1 decimal)
      const byCategoryHours: { [key: string]: number } = {};
      Object.entries(byCategory).forEach(([cat, mins]) => {
        byCategoryHours[cat] = Math.round((mins / 60) * 10) / 10;
      });

      weeklyData.push({
        weekStart: wStart.toISOString().split('T')[0],
        totalHours: Math.round((totalMin / 60) * 10) / 10,
        byCategory: byCategoryHours
      });
    }

    res.json(weeklyData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/mastery-breakdown
router.get('/mastery-breakdown', async (req: Request, res: Response) => {
  try {
    const topics = await prisma.topic.findMany();
    const categories = Object.values(Category);
    
    const breakdown = categories.map(cat => {
      const catTopics = topics.filter(t => t.category === cat);
      return {
        category: cat,
        NOT_STARTED: catTopics.filter(t => t.masteryLevel === 'NOT_STARTED').length,
        LEARNING: catTopics.filter(t => t.masteryLevel === 'LEARNING').length,
        PRACTICING: catTopics.filter(t => t.masteryLevel === 'PRACTICING').length,
        CONFIDENT: catTopics.filter(t => t.masteryLevel === 'CONFIDENT').length,
        MASTERED: catTopics.filter(t => t.masteryLevel === 'MASTERED').length
      };
    });

    res.json(breakdown);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
