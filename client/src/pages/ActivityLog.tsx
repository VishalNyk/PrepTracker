import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  FileText,
  Filter
} from 'lucide-react';
import { API_URL } from '../config';
import type { ActivityLog, Category } from '../types';

const CATEGORIES: Category[] = ['DSA', 'SYSTEM_DESIGN', 'AI_AGENTIC', 'PROJECT', 'APPLICATIONS', 'CLOUD_NATIVE_COMPUTING', 'OTHER'];

const CATEGORY_COLORS: Record<Category, string> = {
  DSA: "text-blue-400 bg-blue-500/10 border-blue-500/25",
  SYSTEM_DESIGN: "text-purple-400 bg-purple-500/10 border-purple-500/25",
  AI_AGENTIC: "text-cyan-400 bg-cyan-500/10 border-cyan-500/25",
  PROJECT: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  APPLICATIONS: "text-orange-400 bg-orange-500/10 border-orange-500/25",
  CLOUD_NATIVE_COMPUTING: "text-teal-400 bg-teal-500/10 border-teal-500/25",
  OTHER: "text-slate-400 bg-slate-500/10 border-slate-500/25",
};

export const ActivityLogPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');
  
  // Quick-add form states
  const [date, setDate] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  );
  const [category, setCategory] = useState<Category>('DSA');
  const [topic, setTopic] = useState<string>('');
  const [durationMin, setDurationMin] = useState<number>(45);
  const [notes, setNotes] = useState<string>('');

  // Inline editing states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editCategory, setEditCategory] = useState<Category>('DSA');
  const [editTopic, setEditTopic] = useState<string>('');
  const [editDurationMin, setEditDurationMin] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  // Fetch activity logs
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['logs', selectedFilterCategory],
    queryFn: async () => {
      const url = new URL(`${API_URL}/logs`);
      if (selectedFilterCategory !== 'ALL') {
        url.searchParams.append('category', selectedFilterCategory);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch activity logs');
      return res.json();
    }
  });

  // Create log mutation
  const createMutation = useMutation({
    mutationFn: async (newLog: Partial<ActivityLog>) => {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
      if (!res.ok) throw new Error('Failed to create log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      // Reset input fields (keep date as today)
      setTopic('');
      setNotes('');
    }
  });

  // Update log mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedLog: Partial<ActivityLog> & { id: number }) => {
      const res = await fetch(`${API_URL}/logs/${updatedLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLog),
      });
      if (!res.ok) throw new Error('Failed to update log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
      setEditingId(null);
    }
  });

  // Delete log mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/logs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['heatmap'] });
    }
  });

  // Handlers
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !durationMin) return;
    createMutation.mutate({
      date,
      category,
      topic: topic.trim() || null,
      durationMin,
      notes: notes.trim() || null
    });
  };

  const startEditing = (log: ActivityLog) => {
    setEditingId(log.id);
    setEditDate(new Date(log.date).toISOString().split('T')[0]);
    setEditCategory(log.category);
    setEditTopic(log.topic || '');
    setEditDurationMin(log.durationMin);
    setEditNotes(log.notes || '');
  };

  const handleUpdateSubmit = (id: number) => {
    updateMutation.mutate({
      id,
      date: editDate,
      category: editCategory,
      topic: editTopic.trim() || null,
      durationMin: editDurationMin,
      notes: editNotes.trim() || null
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-slate-100">
          LOG_MANAGER
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1">
          Record daily preparation metrics and notes
        </p>
      </div>

      {/* Quick Add Form Section */}
      <div className="bg-panel p-6 rounded-lg border border-slate-800">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-500 mb-4 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          Quick Add Activity Log
        </h2>

        <form onSubmit={handleQuickAddSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Date</label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-accent"
              required
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-accent"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Topic</label>
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Graphs - BFS/DFS"
              className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent font-sans"
            />
          </div>

          {/* Duration (mins) */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Duration (min)</label>
            <input 
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(Math.max(1, parseInt(e.target.value, 10) || 0))}
              min="1"
              className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-accent"
              required
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Notes / Summary</label>
            <input 
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key concepts learned, problems solved, or achievements"
              className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent font-sans"
            />
          </div>

          {/* Submit Button */}
          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2 rounded transition-colors text-xs font-mono select-none"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              {createMutation.isPending ? 'LOGGING...' : 'LOG_ACTIVITY'}
            </button>
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-panel rounded-lg border border-slate-800 flex flex-col">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <h3 className="font-mono text-xs text-slate-300 uppercase tracking-wider">
              Recent Activity Logs
            </h3>
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Filter Category:</span>
            <select
              value={selectedFilterCategory}
              onChange={(e) => setSelectedFilterCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-[11px] font-mono text-slate-400 focus:outline-none focus:border-accent"
            >
              <option value="ALL">ALL CATEGORIES</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Core Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 font-mono text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900/30">
                <th className="p-4 w-[130px]">Date</th>
                <th className="p-4 w-[220px]">Category</th>
                <th className="p-4 w-[250px]">Topic</th>
                <th className="p-4 w-[100px] text-right">Duration</th>
                <th className="p-4">Notes</th>
                <th className="p-4 w-[100px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                    loading_logs_database...
                  </td>
                </tr>
              ) : logs?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-mono">
                    NO_LOGS_FOUND_FOR_CRITERIA
                  </td>
                </tr>
              ) : (
                logs?.map((log) => {
                  const isEditing = editingId === log.id;
                  return (
                    <tr key={log.id} className="hover:bg-slate-900/25 transition-colors">
                      {/* Date Column */}
                      <td className="p-4 font-mono">
                        {isEditing ? (
                          <input 
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded p-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-accent w-full"
                          />
                        ) : (
                          new Date(log.date).toISOString().split('T')[0]
                        )}
                      </td>

                      {/* Category Column */}
                      <td className="p-4">
                        {isEditing ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as Category)}
                            className="bg-slate-900 border border-slate-800 rounded p-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-accent w-full"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border uppercase select-none break-words whitespace-normal ${CATEGORY_COLORS[log.category]}`}>
                            {log.category}
                          </span>
                        )}
                      </td>

                      {/* Topic Column */}
                      <td className="p-4">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editTopic}
                            onChange={(e) => setEditTopic(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded p-1 text-xs text-slate-300 focus:outline-none focus:border-accent w-full font-sans"
                          />
                        ) : (
                          <span className="text-slate-200 font-medium">
                            {log.topic || <span className="text-slate-600 italic">No topic</span>}
                          </span>
                        )}
                      </td>

                      {/* Duration Column */}
                      <td className="p-4 text-right font-mono font-semibold">
                        {isEditing ? (
                          <input 
                            type="number"
                            value={editDurationMin}
                            onChange={(e) => setEditDurationMin(Math.max(1, parseInt(e.target.value, 10) || 0))}
                            className="bg-slate-900 border border-slate-800 rounded p-1 text-[11px] font-mono text-slate-300 text-right focus:outline-none focus:border-accent w-full"
                          />
                        ) : (
                          `${log.durationMin} min`
                        )}
                      </td>

                      {/* Notes Column */}
                      <td className="p-4 text-slate-400 break-words max-w-sm">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded p-1 text-xs text-slate-300 focus:outline-none focus:border-accent w-full font-sans"
                          />
                        ) : (
                          log.notes || <span className="text-slate-700 font-mono">—</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="p-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleUpdateSubmit(log.id)}
                              className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                              title="Save Changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Cancel Editing"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => startEditing(log)}
                              className="p-1 text-slate-400 hover:text-accent hover:bg-slate-800/60 rounded transition-colors"
                              title="Edit Log"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this log entry?")) {
                                  deleteMutation.mutate(log.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Delete Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
