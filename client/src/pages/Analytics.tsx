import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Compass, Award } from 'lucide-react';
import { API_URL } from '../config';
import type { WeeklyAnalytics, MasteryBreakdown, Application, Category } from '../types';

const CATEGORY_COLORS: Record<Category, string> = {
  DSA: "#3B82F6", // Blue
  SYSTEM_DESIGN: "#A855F7", // Purple
  AI_AGENTIC: "#22D3EE", // Cyan
  PROJECT: "#22C55E", // Green
  APPLICATIONS: "#F97316", // Orange
  CLOUD_NATIVE_COMPUTING: "#0D9488", // Teal
  OTHER: "#64748B", // Slate
};

const MASTERY_COLORS = {
  'NOT STARTED': "#475569", // Slate
  'LEARNING': "#F97316", // Orange
  'PRACTICING': "#F5A623", // Amber
  'CONFIDENT': "#10B981", // Emerald
  'MASTERED': "#22D3EE" // Cyan
};

export const Analytics: React.FC = () => {
  // 1. Fetch weekly hours
  const { data: weeklyHours, isLoading: isWeeklyLoading } = useQuery<WeeklyAnalytics[]>({
    queryKey: ['weeklyAnalytics'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/analytics/weekly?weeks=12`);
      if (!res.ok) throw new Error('Failed to fetch weekly analytics');
      return res.json();
    }
  });

  // 2. Fetch mastery breakdown
  const { data: masteryBreakdown, isLoading: isMasteryLoading } = useQuery<MasteryBreakdown[]>({
    queryKey: ['masteryBreakdown'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/analytics/mastery-breakdown`);
      if (!res.ok) throw new Error('Failed to fetch mastery breakdown');
      return res.json();
    }
  });

  // 3. Fetch applications (to compute funnel)
  const { data: applications, isLoading: isAppsLoading } = useQuery<Application[]>({
    queryKey: ['applications', 'ALL', 'ALL'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/applications`);
      if (!res.ok) throw new Error('Failed to fetch applications');
      return res.json();
    }
  });

  // Prepare mastery breakdown donut chart data
  const masteryChartData = useMemo(() => {
    if (!masteryBreakdown) return [];
    const totals = {
      'NOT STARTED': 0,
      'LEARNING': 0,
      'PRACTICING': 0,
      'CONFIDENT': 0,
      'MASTERED': 0
    };

    masteryBreakdown.forEach(row => {
      totals['NOT STARTED'] += row.NOT_STARTED;
      totals['LEARNING'] += row.LEARNING;
      totals['PRACTICING'] += row.PRACTICING;
      totals['CONFIDENT'] += row.CONFIDENT;
      totals['MASTERED'] += row.MASTERED;
    });

    return Object.entries(totals).map(([level, count]) => ({
      name: level,
      value: count
    })).filter(d => d.value > 0);
  }, [masteryBreakdown]);

  const totalMasteredTopics = useMemo(() => {
    return masteryChartData.reduce((sum, item) => sum + item.value, 0);
  }, [masteryChartData]);

  // Prepare applications funnel bar chart data
  const funnelChartData = useMemo(() => {
    if (!applications) return [];
    const counts = {
      APPLIED: 0,
      OA: 0,
      INTERVIEW: 0,
      OFFER: 0
    };

    applications.forEach(app => {
      if (app.status in counts) {
        counts[app.status as keyof typeof counts]++;
      }
    });

    return [
      { name: 'Applied', Applications: counts.APPLIED, fill: '#64748B' },
      { name: 'OA', Applications: counts.OA, fill: '#A855F7' },
      { name: 'Interview', Applications: counts.INTERVIEW, fill: '#22D3EE' },
      { name: 'Offer', Applications: counts.OFFER, fill: '#22C55E' }
    ];
  }, [applications]);

  const activeAppsCount = useMemo(() => {
    return applications?.filter(app => ['APPLIED', 'OA', 'INTERVIEW', 'OFFER'].includes(app.status)).length || 0;
  }, [applications]);

  const isAnyLoading = isWeeklyLoading || isMasteryLoading || isAppsLoading;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-slate-100">
          ANALYTICS_DASHBOARD
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1">
          Historical trend logs and funnel progression reports
        </p>
      </div>

      {isAnyLoading ? (
        <div className="text-center font-mono text-xs text-slate-500 py-24 animate-pulse">
          compiling_system_analytics_database...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Row: Weekly Hours Line Chart (Full Width) */}
          <div className="bg-panel p-6 rounded-lg border border-slate-800 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
                Preparation Duration (Weekly Trend)
              </h2>
              <span className="font-mono text-[10px] text-slate-500">Last 12 Weeks</span>
            </div>

            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyHours} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis 
                    dataKey="weekStart" 
                    stroke="#475569" 
                    tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#475569" 
                    tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fill: '#64748B', fontFamily: 'JetBrains Mono', fontSize: 10 } }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#0B0E11', 
                      borderColor: '#334155',
                      borderRadius: '4px',
                      color: '#F8FAFC',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px'
                    }}
                    labelFormatter={(label) => `Week of ${label}`}
                  />
                  <Legend 
                    wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '9px', paddingTop: '10px' }}
                    iconType="rect"
                  />
                  <Line type="monotone" name="DSA" dataKey="byCategory.DSA" stroke={CATEGORY_COLORS.DSA} strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" name="System Design" dataKey="byCategory.SYSTEM_DESIGN" stroke={CATEGORY_COLORS.SYSTEM_DESIGN} strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" name="AI / Agentic" dataKey="byCategory.AI_AGENTIC" stroke={CATEGORY_COLORS.AI_AGENTIC} strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" name="Cloud-Native Computing" dataKey="byCategory.CLOUD_NATIVE_COMPUTING" stroke={CATEGORY_COLORS.CLOUD_NATIVE_COMPUTING} strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" name="Project" dataKey="byCategory.PROJECT" stroke={CATEGORY_COLORS.PROJECT} strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" name="Applications" dataKey="byCategory.APPLICATIONS" stroke={CATEGORY_COLORS.APPLICATIONS} strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" name="Other" dataKey="byCategory.OTHER" stroke={CATEGORY_COLORS.OTHER} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Row: Donut Chart + Funnel Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Mastery Donut */}
            <div className="bg-panel p-6 rounded-lg border border-slate-800 flex flex-col h-[350px]">
              <div className="flex items-center justify-between mb-2 border-b border-slate-800/60 pb-3">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-450" />
                  Topic Mastery Levels
                </h2>
                <span className="font-mono text-[10px] text-slate-500">Distribution</span>
              </div>

              <div className="flex-1 relative flex items-center justify-center">
                {masteryChartData.length === 0 ? (
                  <div className="text-center font-mono text-[10px] text-slate-600">
                    NO_TOPICS_CONFIGURED
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col md:flex-row items-center justify-between">
                    <div className="w-full md:w-3/5 h-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={masteryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {masteryChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={MASTERY_COLORS[entry.name as keyof typeof MASTERY_COLORS] || '#ffffff'} 
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
                            formatter={(value: any) => [`${value} topics`, 'Count']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="font-mono text-xl font-bold text-slate-200 leading-none">
                          {totalMasteredTopics}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                          Total
                        </span>
                      </div>
                    </div>

                    {/* Custom Legend */}
                    <div className="w-full md:w-2/5 flex flex-col gap-1.5 px-4 max-h-[200px] overflow-y-auto">
                      {masteryChartData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] font-mono">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ backgroundColor: MASTERY_COLORS[item.name as keyof typeof MASTERY_COLORS] }}
                            />
                            <span className="text-slate-400 truncate max-w-[85px] uppercase select-none">{item.name}</span>
                          </div>
                          <span className="text-slate-200 font-bold">{item.value} topics</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Applications Pipeline Funnel */}
            <div className="bg-panel p-6 rounded-lg border border-slate-800 flex flex-col h-[350px]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-orange-450" />
                  Application Funnel
                </h2>
                <span className="font-mono text-[10px] text-slate-500">Active Pipeline ({activeAppsCount})</span>
              </div>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelChartData} margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis 
                      stroke="#475569" 
                      tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      allowDecimals={false}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#0B0E11', 
                        borderColor: '#334155',
                        borderRadius: '4px',
                        color: '#F8FAFC',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '10px'
                      }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                    />
                    <Bar 
                      dataKey="Applications" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
