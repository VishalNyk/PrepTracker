import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Flame, 
  Clock, 
  Compass, 
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { Heatmap } from '../components/Heatmap';
import { API_URL } from '../config';
import type { AnalyticsSummary, Milestone, Category } from '../types';

// Category color configurations matching specification
const CATEGORY_COLORS: Record<Category, string> = {
  DSA: "#3B82F6", // Blue
  SYSTEM_DESIGN: "#A855F7", // Purple
  AI_AGENTIC: "#22D3EE", // Cyan
  PROJECT: "#22C55E", // Green
  APPLICATIONS: "#F97316", // Amber
  CLOUD_NATIVE_COMPUTING: "#0D9488", // Teal
  OTHER: "#64748B", // Slate
};

export const Dashboard: React.FC = () => {
  // Fetch analytics summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['analyticsSummary'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/analytics/summary`);
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    }
  });

  // Fetch milestones to list top 5 upcoming
  const { data: milestones, isLoading: isMilestonesLoading } = useQuery<Milestone[]>({
    queryKey: ['milestones'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/milestones`);
      if (!res.ok) throw new Error('Failed to fetch milestones');
      return res.json();
    }
  });

  // Slice milestones to get the next 5 sorted by target date
  const upcomingMilestones = React.useMemo(() => {
    if (!milestones) return [];
    return milestones
      .filter(m => m.status !== 'DONE')
      .slice(0, 5);
  }, [milestones]);

  // Formulate data for the Recharts pie/donut chart
  const categoryChartData = React.useMemo(() => {
    if (!summary || !summary.hoursByCategoryThisWeek) return [];
    return Object.entries(summary.hoursByCategoryThisWeek)
      .map(([category, hours]) => ({
        name: category,
        value: hours
      }))
      .filter(item => item.value > 0); // only show category if worked
  }, [summary]);

  const totalPieHours = React.useMemo(() => {
    return categoryChartData.reduce((sum, item) => sum + item.value, 0);
  }, [categoryChartData]);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-slate-100">
            Control Center
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            System status: nominal // live logging metrics active
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 rounded border border-slate-800 font-mono text-[10px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          ONLINE_SESSION
        </div>
      </div>

      {/* Summary Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Streak card */}
        <div className="bg-panel p-6 rounded-lg border border-slate-800 flex items-center justify-between group transition-all duration-300 hover:border-orange-500/20">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
              Current Streak
            </span>
            <div className="font-mono text-2xl font-bold text-slate-100 flex items-baseline gap-1">
              {isSummaryLoading ? '...' : summary?.currentStreakDays}
              <span className="text-xs text-slate-500 font-normal">days</span>
            </div>
            <span className="text-[10px] font-mono text-orange-500/80 block">
              max: {summary?.longestStreakDays || 0} days
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/30 text-orange-500 group-hover:scale-105 transition-transform duration-200">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Total Hours Card */}
        <div className="bg-panel p-6 rounded-lg border border-slate-800 flex items-center justify-between group transition-all duration-300 hover:border-blue-500/20">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
              Total Hours
            </span>
            <div className="font-mono text-2xl font-bold text-slate-100 flex items-baseline gap-1">
              {isSummaryLoading ? '...' : summary?.totalHoursAllTime}
              <span className="text-xs text-slate-500 font-normal">hrs</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block">
              cumulative logs
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/30 text-blue-500 group-hover:scale-105 transition-transform duration-200">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Hours This Week Card */}
        <div className="bg-panel p-6 rounded-lg border border-slate-800 flex items-center justify-between group transition-all duration-300 hover:border-cyan-500/20">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
              This Week
            </span>
            <div className="font-mono text-2xl font-bold text-slate-100 flex items-baseline gap-1">
              {isSummaryLoading ? '...' : summary?.totalHoursThisWeek}
              <span className="text-xs text-slate-500 font-normal">hrs</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-500/80 block">
              milestones due: {summary?.milestonesDueThisWeek || 0}
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 text-accent group-hover:scale-105 transition-transform duration-200">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Applications in Pipeline Card */}
        <div className="bg-panel p-6 rounded-lg border border-slate-800 flex items-center justify-between group transition-all duration-300 hover:border-emerald-500/20">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
              Pipeline
            </span>
            <div className="font-mono text-2xl font-bold text-slate-100 flex items-baseline gap-1">
              {isSummaryLoading ? '...' : summary?.applicationsInPipeline}
              <span className="text-xs text-slate-500 font-normal">jobs</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block">
              active process pipeline
            </span>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 text-emerald-500 group-hover:scale-105 transition-transform duration-200">
            <Compass className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <Heatmap apiBaseUrl={API_URL} />

      {/* Grid: Upcoming Milestones & Weekly split chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Upcoming Milestones */}
        <div className="bg-panel p-6 rounded-lg border border-slate-800 flex flex-col h-[320px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-200">
              Upcoming Milestones
            </h2>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {isMilestonesLoading ? (
              <div className="text-xs font-mono text-slate-500 py-4 animate-pulse">
                fetching_milestones...
              </div>
            ) : upcomingMilestones.length === 0 ? (
              <div className="text-xs font-mono text-slate-500 py-12 text-center">
                NO_ACTIVE_MILESTONES_FOUND
              </div>
            ) : (
              upcomingMilestones.map((milestone) => (
                <div key={milestone.id} className="space-y-1.5 group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200 group-hover:text-accent transition-colors truncate max-w-[250px]">
                      {milestone.title}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {new Date(milestone.targetDate).toISOString().split('T')[0]}
                    </span>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-950">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${milestone.progressPct}%`,
                          backgroundColor: CATEGORY_COLORS[milestone.category]
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 w-8 text-right">
                      {milestone.progressPct}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Weekly Breakdown Pie/Donut Chart */}
        <div className="bg-panel p-6 rounded-lg border border-slate-800 flex flex-col h-[320px]">
          <div className="flex items-center justify-between mb-2 border-b border-slate-800/60 pb-3">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-200">
              Hours This Week by Category
            </h2>
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </div>

          <div className="flex-1 relative flex items-center justify-center">
            {isSummaryLoading ? (
              <div className="text-xs font-mono text-slate-500 animate-pulse">
                compiling_chart...
              </div>
            ) : categoryChartData.length === 0 ? (
              <div className="text-xs font-mono text-slate-500 text-center">
                NO_ACTIVITY_LOGGED_THIS_WEEK
              </div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-between">
                {/* Recharts Container */}
                <div className="w-full md:w-3/5 h-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CATEGORY_COLORS[entry.name as Category] || '#ffffff'} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#0B0E11', 
                          borderColor: '#334155',
                          borderRadius: '4px',
                          color: '#F8FAFC',
                          fontFamily: 'JetBrains Mono',
                          fontSize: '10px'
                        }}
                        formatter={(value: any) => [`${value} hrs`, 'Duration']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-mono text-lg font-bold text-slate-200 leading-none">
                      {totalPieHours.toFixed(1)}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                      Hours
                    </span>
                  </div>
                </div>

                {/* Legend list on the side */}
                <div className="w-full md:w-2/5 flex flex-col gap-1.5 px-4 max-h-[180px] overflow-y-auto">
                  {categoryChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: CATEGORY_COLORS[item.name as Category] }}
                        />
                        <span className="text-slate-400 select-none">{item.name}</span>
                      </div>
                      <span className="text-slate-200 font-bold">{item.value.toFixed(1)} hrs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
