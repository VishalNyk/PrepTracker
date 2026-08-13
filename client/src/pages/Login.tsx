import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { user, isLocalDev } = useAuth();
  const navigate = useNavigate();

  // If user is already authenticated (or in local dev mock mode), skip login screen
  if (user && !isLocalDev) {
    return <Navigate to="/" replace />;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name.trim() || undefined
            }
          }
        });
        if (error) throw error;
        setSuccessMsg('Account registered successfully! Check your email for validation details or log in.');
      } else {
        // Log in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMsg('Password reset link sent! Check your inbox.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send recovery mail');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.06),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.04),transparent_40%),linear-gradient(180deg,#020617,#0f172a)] p-4 font-sans text-slate-100">
      
      {/* Background blur effects */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[420px] bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            {forgotMode ? 'Recover Password' : isSignUp ? 'Create Account' : 'Welcome to PrepTracker'}
          </h1>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-[0.15em]">
            {forgotMode ? 'RESET_PORTAL' : isSignUp ? 'USER_REGISTRATION' : 'SECURE_LOGIN'}
          </p>
        </div>

        {isLocalDev && (
          <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3 text-center">
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block mb-1">Local Dev Mode Active</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vite environment is not configured with Supabase keys. Auth checks are bypassed automatically. Click "Sign in as Guest" below to start coding locally.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-2.5 w-full py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase tracking-wider border border-amber-500/25 transition-all cursor-pointer"
            >
              Sign in as Guest
            </button>
          </div>
        )}

        {/* Info alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded border border-rose-500/25 bg-rose-500/5 text-rose-300 text-xs leading-relaxed animate-shake">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded border border-emerald-500/25 bg-emerald-500/5 text-emerald-300 text-xs leading-relaxed">
            {successMsg}
          </div>
        )}

        {!isLocalDev && !forgotMode && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            
            {isSignUp && (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition-all font-sans"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition-all font-sans"
                required
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition-all font-sans"
                required
              />
            </div>

            {!isSignUp && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-[11px] font-mono text-slate-500 hover:text-cyan-400 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-mono uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'REGISTER' : 'LOG_IN'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {forgotMode && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="Registered Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition-all font-sans"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-mono uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SEND_RESET_LINK'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {!isLocalDev && !forgotMode && (
          <div className="space-y-4">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-850"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-600 uppercase tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-slate-850"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-slate-100 hover:border-slate-700 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.472 0-6.29-2.818-6.29-6.29s2.818-6.29 6.29-6.29c1.635 0 3.107.622 4.225 1.635L21.232 4.4A11.96 11.96 0 0012.24 0C5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.76 0 12.24-5.48 12.24-12.24 0-.832-.083-1.635-.24-2.41H12.24z"/>
              </svg>
              Google Account
            </button>
          </div>
        )}

        {!forgotMode && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-[11px] font-mono text-slate-500 hover:text-cyan-400 uppercase tracking-wider transition-colors cursor-pointer"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
};
