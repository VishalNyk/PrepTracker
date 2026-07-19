import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeatmapDay {
  date: string;
  totalMinutes: number;
  topCategory: string;
  isPadded: boolean;
}

interface HeatmapProps {
  apiBaseUrl: string;
}

export const Heatmap: React.FC<HeatmapProps> = ({ apiBaseUrl }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    totalMinutes: number;
    topCategory: string;
    clientX: number;
    clientY: number;
  } | null>(null);

  // Fetch heatmap data for the selected year
  const { data: serverHeatmapData, isLoading } = useQuery<Array<{ date: string; totalMinutes: number; topCategory: string }>>({
    queryKey: ['heatmap', selectedYear],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/logs/heatmap?year=${selectedYear}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  // Generate the dates grid
  const gridDays = useMemo(() => {
    const days: HeatmapDay[] = [];
    
    // Start of the year
    const jan1 = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0));
    const startDayOfWeek = jan1.getUTCDay(); // 0 is Sunday, 1 is Monday, etc.
    
    // 1. Pad the beginning of the year so Jan 1 starts on the correct row
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        date: '',
        totalMinutes: 0,
        topCategory: '',
        isPadded: true,
      });
    }

    // 2. Add all days of the year
    const totalDays = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0 ? 366 : 365;
    const dataMap = new Map<string, { totalMinutes: number; topCategory: string }>();
    
    if (serverHeatmapData) {
      serverHeatmapData.forEach(item => {
        dataMap.set(item.date, { totalMinutes: item.totalMinutes, topCategory: item.topCategory });
      });
    }

    for (let d = 0; d < totalDays; d++) {
      const currentDate = new Date(Date.UTC(selectedYear, 0, 1 + d, 0, 0, 0));
      const dateKey = currentDate.toISOString().split('T')[0];
      
      const dayData = dataMap.get(dateKey) || { totalMinutes: 0, topCategory: 'None' };
      
      days.push({
        date: dateKey,
        totalMinutes: dayData.totalMinutes,
        topCategory: dayData.topCategory,
        isPadded: false,
      });
    }

    // 3. Pad the end of the year to make it a multiple of 7 (53 columns)
    const totalGridCells = 53 * 7;
    const remainingCells = totalGridCells - days.length;
    for (let i = 0; i < remainingCells; i++) {
      days.push({
        date: '',
        totalMinutes: 0,
        topCategory: '',
        isPadded: true,
      });
    }

    return days;
  }, [selectedYear, serverHeatmapData]);

  // Compute month labels layout
  const monthLabels = useMemo(() => {
    const labels: Array<{ text: string; colSpan: number }> = [];
    const jan1 = new Date(Date.UTC(selectedYear, 0, 1));
    const startDayOfWeek = jan1.getUTCDay();

    // Map month names
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // We will place month name at the first column where that month starts
    const colIndices = Array(12).fill(0);
    for (let m = 0; m < 12; m++) {
      const firstDay = new Date(Date.UTC(selectedYear, m, 1));
      const diff = firstDay.getTime() - new Date(Date.UTC(selectedYear, 0, 1)).getTime();
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
      const colIndex = Math.floor((dayOfYear + startDayOfWeek) / 7);
      colIndices[m] = colIndex;
    }

    // Generate column segments
    let lastCol = 0;
    for (let m = 0; m < 12; m++) {
      const targetCol = colIndices[m];
      if (m > 0 && targetCol > lastCol) {
        // Empty or label spacer
        labels.push({ text: months[m - 1], colSpan: targetCol - lastCol });
        lastCol = targetCol;
      }
    }
    // Final month span
    labels.push({ text: months[11], colSpan: 53 - lastCol });

    return labels;
  }, [selectedYear]);

  // Determine cell color
  const getCellColor = (totalMinutes: number, isPadded: boolean) => {
    if (isPadded) return 'bg-transparent';
    if (totalMinutes === 0) return 'bg-slate-900 border border-slate-950 hover:border-slate-700';
    if (totalMinutes <= 30) return 'bg-cyan-950/70 border border-cyan-900/40 hover:bg-cyan-900/90';
    if (totalMinutes <= 60) return 'bg-cyan-800/90 border border-cyan-700/50 hover:bg-cyan-700';
    if (totalMinutes <= 120) return 'bg-cyan-600 border border-cyan-500/60 hover:bg-cyan-500';
    return 'bg-cyan-400 border border-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.4)] hover:bg-cyan-300';
  };

  const handleMouseMove = (e: React.MouseEvent, day: HeatmapDay) => {
    if (day.isPadded || day.totalMinutes === 0) return;
    setHoveredCell({
      date: day.date,
      totalMinutes: day.totalMinutes,
      topCategory: day.topCategory,
      clientX: e.clientX,
      clientY: e.clientY
    });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div className="bg-panel p-6 rounded-lg border border-slate-800 flex flex-col gap-4 relative">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-slate-200">
            Activity Heatmap
          </h2>
          {isLoading && (
            <span className="text-[10px] text-cyan-500 animate-pulse font-mono font-medium lowercase">
              [loading_metrics...]
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setSelectedYear(y => y - 1)}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-slate-300 font-bold px-3 py-1 bg-slate-900 rounded border border-slate-800">
            {selectedYear}
          </span>
          <button 
            onClick={() => setSelectedYear(y => y + 1)}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px] flex flex-col gap-1.5">
          {/* Months label row */}
          <div className="flex pl-8">
            <div className="grid grid-cols-53 gap-[3px] w-full text-[10px] text-slate-500 font-mono">
              {monthLabels.map((lbl, idx) => (
                <div 
                  key={idx} 
                  style={{ gridColumn: `span ${lbl.colSpan} / span ${lbl.colSpan}` }}
                  className="truncate text-left pl-0.5"
                >
                  {lbl.text}
                </div>
              ))}
            </div>
          </div>

          {/* Grid core layout: Days to left, Heatmap grid to right */}
          <div className="flex">
            {/* Days labels */}
            <div className="w-8 flex flex-col justify-between pr-2 text-[10px] text-slate-500 font-mono py-1 leading-none select-none">
              <span>Sun</span>
              <span className="text-slate-400">Mon</span>
              <span>Tue</span>
              <span className="text-slate-400">Wed</span>
              <span>Thu</span>
              <span className="text-slate-400">Fri</span>
              <span>Sat</span>
            </div>

            {/* Heatmap Grid */}
            <div className="grid grid-rows-7 grid-flow-col gap-[3px] flex-1">
              {gridDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-sm transition-all duration-150 cursor-pointer ${getCellColor(day.totalMinutes, day.isPadded)}`}
                  onMouseMove={(e) => handleMouseMove(e, day)}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid legend */}
      <div className="flex items-center justify-end gap-2 text-[10px] text-slate-500 font-mono mt-2">
        <span>Less</span>
        <div className="w-3.5 h-3.5 bg-slate-900 border border-slate-950 rounded-sm" />
        <div className="w-3.5 h-3.5 bg-cyan-950/70 border border-cyan-900/40 rounded-sm" />
        <div className="w-3.5 h-3.5 bg-cyan-800/90 border border-cyan-700/50 rounded-sm" />
        <div className="w-3.5 h-3.5 bg-cyan-600 border border-cyan-500/60 rounded-sm" />
        <div className="w-3.5 h-3.5 bg-cyan-400 border border-cyan-300 rounded-sm" />
        <span>More</span>
      </div>

      {/* Tooltip Popup */}
      {hoveredCell && (
        <div 
          className="fixed z-50 bg-slate-950 border border-slate-800 p-2.5 rounded shadow-xl font-mono text-[10px] pointer-events-none text-slate-200 flex flex-col gap-1 min-w-[150px]"
          style={{
            left: `${hoveredCell.clientX + 12}px`,
            top: `${hoveredCell.clientY + 12}px`,
          }}
        >
          <div className="text-slate-400 font-bold border-b border-slate-800/60 pb-1 mb-1">
            {hoveredCell.date}
          </div>
          <div>
            Duration: <span className="text-accent font-bold">{hoveredCell.totalMinutes} mins</span>
          </div>
          {hoveredCell.topCategory !== 'None' && (
            <div>
              Primary: <span className="text-slate-300 uppercase tracking-wider">{hoveredCell.topCategory}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
