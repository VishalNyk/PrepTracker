import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2, 
  X,
  Filter,
  ChevronDown
} from 'lucide-react';
import { API_URL } from '../config';
import type { Application, ApplicationStatus } from '../types';

const STATUSES: ApplicationStatus[] = ['APPLIED', 'OA', 'INTERVIEW', 'OFFER', 'REJECTED', 'GHOSTED'];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  OA: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  INTERVIEW: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_4px_rgba(34,211,238,0.15)]",
  OFFER: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_6px_rgba(34,197,94,0.2)]",
  REJECTED: "text-rose-450 bg-rose-500/5 border-rose-500/15",
  GHOSTED: "text-slate-600 bg-slate-800/10 border-slate-800/20"
};

const TIER_COLORS: Record<number, string> = {
  1: "text-rose-400 border-rose-500/20 bg-rose-500/5", // Top priority
  2: "text-amber-400 border-amber-500/20 bg-amber-500/5", // Mid priority
  3: "text-slate-400 border-slate-500/20 bg-slate-500/5" // Low priority
};

export const Applications: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTier, setFilterTier] = useState<string>('ALL');

  // Form States
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [tier, setTier] = useState<number>(1);
  const [status, setStatus] = useState<ApplicationStatus>('APPLIED');
  const [appliedDate, setAppliedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Fetch Applications
  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ['applications', filterStatus, filterTier],
    queryFn: async () => {
      const url = new URL(`${API_URL}/applications`);
      if (filterStatus !== 'ALL') {
        url.searchParams.append('status', filterStatus);
      }
      if (filterTier !== 'ALL') {
        url.searchParams.append('tier', filterTier);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch applications');
      return res.json();
    }
  });

  // Create Application
  const createMutation = useMutation({
    mutationFn: async (app: Partial<Application>) => {
      const res = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app)
      });
      if (!res.ok) throw new Error('Failed to create application');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setIsModalOpen(false);
      // Reset Form
      setCompanyName('');
      setRole('');
      setTier(1);
      setStatus('APPLIED');
      setAppliedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  });

  // Update Status / Notes Inline
  const updateMutation = useMutation({
    mutationFn: async (updated: { id: number; status?: ApplicationStatus; notes?: string }) => {
      const res = await fetch(`${API_URL}/applications/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Failed to update application');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    }
  });

  // Delete Application
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/applications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete application');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !role || !appliedDate) return;
    createMutation.mutate({
      companyName,
      role,
      tier,
      status,
      appliedDate,
      notes: notes.trim() || null
    });
  };

  const handleStatusChange = (id: number, newStatus: ApplicationStatus) => {
    updateMutation.mutate({ id, status: newStatus });
  };

  const handleNotesChange = (id: number, text: string) => {
    updateMutation.mutate({ id, notes: text });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-slate-100">
            APPLICATIONS_PIPELINE
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Manage target companies, priorities, and recruitment stages
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-slate-950 font-bold px-3.5 py-2 rounded text-xs font-mono transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          ADD_APPLICATION
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-panel rounded-lg border border-slate-800 flex flex-col">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/10">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <h3 className="font-mono text-xs text-slate-300 uppercase tracking-wider">
              Application Tracker
            </h3>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-[11px] font-mono text-slate-400 focus:outline-none focus:border-accent"
              >
                <option value="ALL">ALL STATUSES</option>
                {STATUSES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Tier Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Priority:</span>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-[11px] font-mono text-slate-400 focus:outline-none focus:border-accent"
              >
                <option value="ALL">ALL TIERS</option>
                <option value="1">TIER 1 (HIGH)</option>
                <option value="2">TIER 2 (MID)</option>
                <option value="3">TIER 3 (LOW)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Core Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 font-mono text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900/30">
                <th className="p-4">Company</th>
                <th className="p-4">Role</th>
                <th className="p-4 w-[90px] text-center">Priority</th>
                <th className="p-4 w-[160px]">Status</th>
                <th className="p-4 w-[110px]">Applied</th>
                <th className="p-4 w-[110px]">Last Update</th>
                <th className="p-4 min-w-[200px]">Notes</th>
                <th className="p-4 w-[80px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                    loading_job_pipeline...
                  </td>
                </tr>
              ) : applications?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-mono">
                    NO_APPLICATIONS_RECORDED
                  </td>
                </tr>
              ) : (
                applications?.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-900/25 transition-colors">
                    {/* Company */}
                    <td className="p-4 font-semibold text-slate-200">
                      {app.companyName}
                    </td>

                    {/* Role */}
                    <td className="p-4 text-slate-300">
                      {app.role}
                    </td>

                    {/* Priority Tier */}
                    <td className="p-4 text-center">
                      <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase select-none ${TIER_COLORS[app.tier]}`}>
                        T{app.tier}
                      </span>
                    </td>

                    {/* Status inline update dropdown */}
                    <td className="p-4">
                      <div className="relative inline-block w-full">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                          className={`w-full text-[10px] font-mono font-bold px-2.5 py-1 rounded border uppercase cursor-pointer focus:outline-none focus:border-accent appearance-none ${STATUS_COLORS[app.status]}`}
                        >
                          {STATUSES.map(st => (
                            <option key={st} value={st} className="bg-panel text-slate-300 font-mono">{st}</option>
                          ))}
                        </select>
                        <div className="absolute right-2 top-2.5 pointer-events-none text-slate-400">
                          <ChevronDown className="w-3 h-3" />
                        </div>
                      </div>
                    </td>

                    {/* Applied Date */}
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(app.appliedDate).toISOString().split('T')[0]}
                    </td>

                    {/* Last Update */}
                    <td className="p-4 font-mono text-slate-400">
                      {new Date(app.lastUpdate).toISOString().split('T')[0]}
                    </td>

                    {/* Notes inline editable text */}
                    <td className="p-4">
                      <input 
                        type="text"
                        defaultValue={app.notes || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (app.notes || '')) {
                            handleNotesChange(app.id, e.target.value.trim());
                          }
                        }}
                        placeholder="Click to add process notes..."
                        className="bg-transparent hover:bg-slate-900/35 border border-transparent hover:border-slate-800 rounded px-2 py-1 text-slate-400 placeholder-slate-700 focus:bg-slate-900 focus:border-accent w-full text-xs font-sans transition-all focus:text-slate-200"
                      />
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete application for ${app.companyName}?`)) {
                            deleteMutation.mutate(app.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-450 hover:bg-rose-500/10 rounded transition-colors"
                        title="Delete Application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Application Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-slate-800 rounded-lg w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/20">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                Log New Application
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Company Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Google, Anthropic, Stripe"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent w-full font-sans"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Job Role</label>
                  <input 
                    type="text"
                    placeholder="e.g. Senior Software Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent w-full font-sans"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Priority Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(parseInt(e.target.value, 10))}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-accent w-full"
                  >
                    <option value="1">Tier 1 (High)</option>
                    <option value="2">Tier 2 (Medium)</option>
                    <option value="3">Tier 3 (Low)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Applied Date</label>
                  <input 
                    type="date"
                    value={appliedDate}
                    onChange={(e) => setAppliedDate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-accent w-full"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Current Stage</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-accent w-full"
                  >
                    {STATUSES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Process Notes</label>
                  <textarea 
                    placeholder="Referral detail, interviewer names, next steps..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-accent w-full font-sans"
                  />
                </div>
              </div>

              {/* Action buttons */}
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
                  disabled={createMutation.isPending}
                  className="bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2 rounded text-xs font-mono transition-colors"
                >
                  LOG_JOB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
