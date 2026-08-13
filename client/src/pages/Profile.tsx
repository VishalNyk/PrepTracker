import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { API_URL } from '../config';
import { User, Mail, ShieldAlert, LogOut, Check, Loader2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, logout, isLocalDev } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name);
    } else if (user?.email) {
      setName(user.email.split('@')[0]);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setUpdatingProfile(true);
    setProfileMsg(null);

    try {
      if (!isLocalDev) {
        // 1. Update Supabase auth profile
        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: name.trim() }
        });
        if (authError) throw authError;

        // 2. Sync profile details with local Postgres server
        const res = await fetch(`${API_URL}/api/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() })
        });
        if (!res.ok) throw new Error('Failed to synchronize user name with Postgres database');
      }
      setProfileMsg({ type: 'success', text: 'Name updated successfully!' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLocalDev) return;

    if (password !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setUpdatingPassword(true);
    setPassMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassMsg({ type: 'success', text: 'Password changed successfully!' });
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const initial = name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background font-sans text-slate-100">
      
      {/* Header */}
      <div>
        <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-slate-100">
          ACCOUNT_SETTINGS
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1">
          Manage user profile details, credentials, and configuration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Profile Card Summary */}
        <div className="bg-panel border border-slate-800 rounded-xl p-6 flex flex-col items-center text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 text-3xl font-bold font-mono">
            {initial}
          </div>
          
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-200">{name}</h2>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 font-mono">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </p>
          </div>

          {isLocalDev && (
            <div className="border border-amber-500/25 bg-amber-500/5 rounded-lg p-3 text-xs leading-relaxed text-slate-400">
              <ShieldAlert className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              Running in **Guest Local Dev Mode** (Supabase URL unconfigured). Password alterations are disabled.
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-rose-950/40 bg-rose-950/20 text-rose-450 hover:bg-rose-900/40 hover:border-rose-800 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Edit Fields */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* General Profile Settings */}
          <div className="bg-panel border border-slate-800 rounded-xl p-6 space-y-6">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-350 border-b border-slate-850 pb-2">
              General Info
            </h3>

            {profileMsg && (
              <div className={`p-3 rounded text-xs border ${
                profileMsg.type === 'success' 
                  ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300' 
                  : 'border-rose-500/25 bg-rose-500/5 text-rose-300'
              }`}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Display Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 pl-10 text-xs text-slate-200 focus:outline-none focus:border-accent w-full font-sans"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingProfile}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
              >
                {updatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </form>
          </div>

          {/* Password Section */}
          {!isLocalDev && (
            <div className="bg-panel border border-slate-800 rounded-xl p-6 space-y-6">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-350 border-b border-slate-850 pb-2">
                Change Password
              </h3>

              {passMsg && (
                <div className={`p-3 rounded text-xs border ${
                  passMsg.type === 'success' 
                    ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300' 
                    : 'border-rose-500/25 bg-rose-500/5 text-rose-300'
                }`}>
                  {passMsg.text}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent w-full"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent w-full"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-slate-950 font-bold px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {updatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Change Password
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
