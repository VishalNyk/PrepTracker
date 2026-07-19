import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square,
  ArrowUp,
  ArrowDown,
  Calendar,
  X
} from 'lucide-react';
import { API_URL } from '../config';
import type { Milestone, Category, MilestoneStatus, MilestoneTask } from '../types';

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

export const Milestones: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedMilestones, setExpandedMilestones] = useState<Record<number, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Milestone Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('DSA');
  const [newTargetDate, setNewTargetDate] = useState('');

  // Inline New Sub-Task Input State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<Record<number, string>>({});

  // Fetch Milestones
  const { data: milestones, isLoading } = useQuery<Milestone[]>({
    queryKey: ['milestones'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/milestones`);
      if (!res.ok) throw new Error('Failed to fetch milestones');
      return res.json();
    }
  });

  // Create Milestone
  const createMilestoneMutation = useMutation({
    mutationFn: async (milestone: { title: string; category: Category; targetDate: string }) => {
      const res = await fetch(`${API_URL}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestone)
      });
      if (!res.ok) throw new Error('Failed to create milestone');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setIsModalOpen(false);
      setNewTitle('');
      setNewTargetDate('');
      // Auto-expand newly created milestone
      setExpandedMilestones(prev => ({ ...prev, [data.id]: true }));
    }
  });

  // Delete Milestone
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/milestones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete milestone');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    }
  });

  // Add Task to Milestone
  const addTaskMutation = useMutation({
    mutationFn: async ({ milestoneId, title }: { milestoneId: number; title: string }) => {
      const res = await fetch(`${API_URL}/milestones/${milestoneId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('Failed to add task');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setNewSubtaskTitle(prev => ({ ...prev, [variables.milestoneId]: '' }));
    }
  });

  // Toggle Task isDone
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ milestoneId, taskId, isDone }: { milestoneId: number; taskId: number; isDone: boolean }) => {
      const res = await fetch(`${API_URL}/milestones/${milestoneId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone })
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    }
  });

  // Reorder Task
  const reorderTaskMutation = useMutation({
    mutationFn: async ({ milestoneId, taskId, order }: { milestoneId: number; taskId: number; order: number }) => {
      const res = await fetch(`${API_URL}/milestones/${milestoneId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      if (!res.ok) throw new Error('Failed to reorder task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    }
  });

  // Delete Task
  const deleteTaskMutation = useMutation({
    mutationFn: async ({ milestoneId, taskId }: { milestoneId: number; taskId: number }) => {
      const res = await fetch(`${API_URL}/milestones/${milestoneId}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    }
  });

  // Toggle expansion state
  const toggleExpand = (id: number) => {
    setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newTargetDate) return;
    createMilestoneMutation.mutate({
      title: newTitle,
      category: newCategory,
      targetDate: newTargetDate
    });
  };

  const handleAddSubtask = (milestoneId: number) => {
    const title = newSubtaskTitle[milestoneId];
    if (!title || !title.trim()) return;
    addTaskMutation.mutate({ milestoneId, title: title.trim() });
  };

  const handleMoveTask = (milestone: Milestone, task: MilestoneTask, direction: 'up' | 'down') => {
    const sortedTasks = [...milestone.tasks].sort((a, b) => a.order - b.order);
    const index = sortedTasks.findIndex(t => t.id === task.id);
    if (direction === 'up' && index > 0) {
      const otherTask = sortedTasks[index - 1];
      reorderTaskMutation.mutate({ milestoneId: milestone.id, taskId: task.id, order: otherTask.order });
      reorderTaskMutation.mutate({ milestoneId: milestone.id, taskId: otherTask.id, order: task.order });
    } else if (direction === 'down' && index < sortedTasks.length - 1) {
      const otherTask = sortedTasks[index + 1];
      reorderTaskMutation.mutate({ milestoneId: milestone.id, taskId: task.id, order: otherTask.order });
      reorderTaskMutation.mutate({ milestoneId: milestone.id, taskId: otherTask.id, order: task.order });
    }
  };

  // Group milestones by status
  const groupedMilestones = React.useMemo(() => {
    const groups: Record<MilestoneStatus, Milestone[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      DONE: []
    };
    if (milestones) {
      milestones.forEach(m => {
        groups[m.status].push(m);
      });
    }
    return groups;
  }, [milestones]);

  const columns: { status: MilestoneStatus; label: string; color: string }[] = [
    { status: 'NOT_STARTED', label: 'Not Started', color: 'border-slate-800 bg-slate-950/20' },
    { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-cyan-500/20 bg-cyan-950/5' },
    { status: 'DONE', label: 'Done', color: 'border-emerald-500/20 bg-emerald-950/5' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-slate-100">
            MILESTONES_BOARD
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Track key preparation objectives and subtasks
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-slate-950 font-bold px-3.5 py-2 rounded text-xs font-mono transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          NEW_MILESTONE
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {columns.map(col => (
          <div 
            key={col.status} 
            className={`rounded-lg border p-4 flex flex-col gap-4 min-h-[500px] ${col.color}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-400">
                {col.label}
              </span>
              <span className="font-mono text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                {groupedMilestones[col.status].length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex flex-col gap-3 overflow-y-auto">
              {isLoading ? (
                <div className="text-center font-mono text-[10px] text-slate-600 py-12 animate-pulse">
                  loading_milestones...
                </div>
              ) : groupedMilestones[col.status].length === 0 ? (
                <div className="text-center font-mono text-[10px] text-slate-600 py-12 border border-dashed border-slate-800/40 rounded">
                  NO_MILESTONES
                </div>
              ) : (
                groupedMilestones[col.status].map(milestone => {
                  const isExpanded = !!expandedMilestones[milestone.id];
                  const sortedTasks = [...milestone.tasks].sort((a, b) => a.order - b.order);

                  return (
                    <div 
                      key={milestone.id} 
                      className="bg-panel border border-slate-800/80 rounded-md transition-all hover:border-slate-700/80 flex flex-col overflow-hidden"
                    >
                      {/* Card Info */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm border uppercase select-none ${CATEGORY_COLORS[milestone.category]}`}>
                            {milestone.category}
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm("Delete this milestone and all its subtasks?")) {
                                deleteMilestoneMutation.mutate(milestone.id);
                              }
                            }}
                            className="text-slate-600 hover:text-rose-400 transition-colors p-0.5 hover:bg-slate-800/50 rounded"
                            title="Delete Milestone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h3 className="font-semibold text-slate-200 text-xs">
                          {milestone.title}
                        </h3>

                        {/* Progress Meter */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>Progress</span>
                            <span>{milestone.progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-950">
                            <div 
                              className="h-full rounded-full bg-accent transition-all duration-300"
                              style={{ width: `${milestone.progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Date and Expand Controls */}
                        <div className="flex items-center justify-between border-t border-slate-800/50 pt-2.5 mt-2.5">
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[9px]">
                            <Calendar className="w-3 h-3 text-slate-600" />
                            <span>{new Date(milestone.targetDate).toISOString().split('T')[0]}</span>
                          </div>

                          <button
                            onClick={() => toggleExpand(milestone.id)}
                            className="flex items-center gap-1 text-[9px] font-mono text-slate-400 hover:text-accent select-none"
                          >
                            <span>CHECKLIST</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Checklist Section */}
                      {isExpanded && (
                        <div className="border-t border-slate-800 bg-slate-900/10 p-4 space-y-3 font-sans text-xs">
                          {/* List of subtasks */}
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {sortedTasks.length === 0 ? (
                              <div className="text-[10px] font-mono text-slate-600 text-center py-2">
                                NO_SUBTASKS_YET
                              </div>
                            ) : (
                              sortedTasks.map((task, idx) => (
                                <div 
                                  key={task.id} 
                                  className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-slate-900/40 group/task border border-transparent hover:border-slate-800/60 transition-all"
                                >
                                  {/* Left: Checkbox + Title */}
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <button
                                      onClick={() => toggleTaskMutation.mutate({ 
                                        milestoneId: milestone.id, 
                                        taskId: task.id, 
                                        isDone: !task.isDone 
                                      })}
                                      className="text-slate-500 hover:text-accent transition-colors flex-shrink-0"
                                    >
                                      {task.isDone ? (
                                        <CheckSquare className="w-4 h-4 text-accent" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </button>
                                    <span className={`truncate leading-tight ${task.isDone ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                      {task.title}
                                    </span>
                                  </div>

                                  {/* Right: Reorder arrows + Delete */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleMoveTask(milestone, task, 'up')}
                                      disabled={idx === 0}
                                      className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveTask(milestone, task, 'down')}
                                      disabled={idx === sortedTasks.length - 1}
                                      className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-30"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteTaskMutation.mutate({ 
                                        milestoneId: milestone.id, 
                                        taskId: task.id 
                                      })}
                                      className="p-0.5 text-slate-500 hover:text-rose-400 ml-1"
                                      title="Delete Subtask"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add Subtask Input Inline */}
                          <div className="flex gap-1.5 pt-1.5 border-t border-slate-800/40">
                            <input 
                              type="text"
                              placeholder="New sub-task title..."
                              value={newSubtaskTitle[milestone.id] || ''}
                              onChange={(e) => setNewSubtaskTitle(prev => ({ ...prev, [milestone.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddSubtask(milestone.id);
                              }}
                              className="bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-accent flex-1 font-sans"
                            />
                            <button
                              onClick={() => handleAddSubtask(milestone.id)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-1.5 rounded"
                              title="Add Subtask"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Milestone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-slate-800 rounded-lg w-full max-w-md overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                Create New Milestone
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddMilestone} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Milestone Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Master Graph Theory & BFS/DFS"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent w-full font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Category)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-accent w-full"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Target Date</label>
                  <input 
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-accent w-full"
                    required
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold px-4 py-2 rounded text-xs font-mono border border-slate-800 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={createMilestoneMutation.isPending}
                  className="bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2 rounded text-xs font-mono transition-colors"
                >
                  CREATE_MILESTONE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
