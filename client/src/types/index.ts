export type Category = 'DSA' | 'SYSTEM_DESIGN' | 'AI_AGENTIC' | 'PROJECT' | 'APPLICATIONS' | 'CLOUD_NATIVE_COMPUTING' | 'OTHER';

export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export type MasteryLevel = 'NOT_STARTED' | 'LEARNING' | 'PRACTICING' | 'CONFIDENT' | 'MASTERED';

export type ApplicationStatus = 'APPLIED' | 'OA' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'GHOSTED';

export interface ActivityLog {
  id: number;
  date: string;
  category: Category;
  topic: string | null;
  durationMin: number;
  notes: string | null;
  createdAt: string;
}

export interface MilestoneTask {
  id: number;
  milestoneId: number;
  title: string;
  isDone: boolean;
  order: number;
}

export interface Milestone {
  id: number;
  title: string;
  category: Category;
  targetDate: string;
  status: MilestoneStatus;
  progressPct: number;
  createdAt: string;
  tasks: MilestoneTask[];
}

export interface TopicNote {
  id: number;
  topicId: number;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: number;
  category: Category;
  name: string;
  masteryLevel: MasteryLevel;
  lastPracticed: string | null;
  notes: string | null;
  topicNotes: TopicNote[];
}

export interface Application {
  id: number;
  companyName: string;
  role: string;
  tier: number;
  status: ApplicationStatus;
  appliedDate: string;
  lastUpdate: string;
  notes: string | null;
}

export interface AnalyticsSummary {
  currentStreakDays: number;
  longestStreakDays: number;
  totalHoursAllTime: number;
  totalHoursThisWeek: number;
  hoursByCategoryThisWeek: Record<Category, number>;
  milestonesDueThisWeek: number;
  applicationsInPipeline: number;
}

export interface WeeklyAnalytics {
  weekStart: string;
  totalHours: number;
  byCategory: Record<Category, number>;
}

export interface MasteryBreakdown {
  category: Category;
  NOT_STARTED: number;
  LEARNING: number;
  PRACTICING: number;
  CONFIDENT: number;
  MASTERED: number;
}
