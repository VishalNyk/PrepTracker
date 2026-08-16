import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { 
  Mail, 
  Lock, 
  User, 
  Loader2, 
  ArrowRight, 
  Terminal, 
  Brain, 
  Trophy, 
  Briefcase, 
  Activity, 
  Sparkles,
  Code2
} from 'lucide-react';

const MOCK_CODE = `// prep-tracker/dsa/graphs.ts
function breadthFirstSearch(graph: Graph, startNode: string) {
  const queue: string[] = [startNode];
  const visited = new Set<string>([startNode]);
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    console.log(\`Practicing topic: \${node} [MASTERY: LEARNING]\`);
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}`;

export const Login: React.FC = () => {
  const { user, isLocalDev } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If user is already authenticated (or in local dev mock mode), skip login screen
  if (user && !isLocalDev) {
    return <Navigate to="/" replace />;
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
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
    <div className="min-h-screen w-full flex bg-[#020617] text-slate-100 font-sans relative overflow-hidden select-none">
      
      {/* Code grid patterns background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      
      {/* Floating neon lighting blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Main split-view container */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full relative z-10">
        
        {/* LEFT COLUMN: DSA, Interview & Coding features showcase (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative border-r border-slate-900/60 bg-slate-950/20">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Terminal className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
                PREP_TRACKER
              </h1>
              <p className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest leading-none">
                DSA_ENGINE // RUNNING
              </p>
            </div>
          </div>

          {/* Central Showcase: Mock Terminal with DFS/BFS code */}
          <div className="space-y-8 my-auto max-w-[500px]">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/40 text-xs font-mono text-cyan-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Optimize Your Tech Interview Prep</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-450 bg-clip-text text-transparent leading-snug">
                Your sandbox for mastering data structures & cracking coding interviews.
              </h2>
            </div>

            {/* Mock IDE Card */}
            <div className="w-full bg-slate-950/60 backdrop-blur border border-slate-900 rounded-xl overflow-hidden shadow-2xl relative">
              {/* Header tab */}
              <div className="bg-slate-950 border-b border-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-cyan-500/70" />
                  graphs.ts
                </div>
                <div className="w-8" />
              </div>
              
              {/* Code region */}
              <div className="p-5 font-mono text-[11px] leading-relaxed text-slate-400 overflow-x-auto select-text">
                <pre className="whitespace-pre">
                  {MOCK_CODE.split('\n').map((line, idx) => (
                    <div key={idx} className="flex gap-4">
                      <span className="text-slate-700 text-right w-5 select-none">{idx + 1}</span>
                      <span>
                        {line.startsWith('//') ? (
                          <span className="text-slate-600">{line}</span>
                        ) : (
                          // simple highlight
                          line
                            .replace(/(function|let|const|new|while|for|if|return)/g, '<span class="text-cyan-400 font-semibold">$1</span>')
                            .replace(/(console\.log|breadthFirstSearch|console|visited)/g, '<span class="text-indigo-400">$1</span>')
                            .replace(/(Queue|Set|Graph)/g, '<span class="text-emerald-400 font-semibold">$1</span>')
                            .replace(/`([^`]+)`/g, '<span class="text-amber-400">`$1`</span>')
                            .replace(/("placeholder"|'placeholder'|'graphs.ts')/g, '<span class="text-amber-400">$1</span>')
                            .split(' ')
                            .map((w, i) => <span key={i} dangerouslySetInnerHTML={{ __html: w + ' ' }} />)
                        )}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </div>

          {/* Footer metrics */}
          <div className="grid grid-cols-3 gap-6 border-t border-slate-900/60 pt-8">
            <div className="space-y-1">
              <div className="text-slate-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
                <Brain className="w-3 h-3 text-cyan-500" />
                DSA Mastery
              </div>
              <p className="text-xs text-slate-300 font-medium">Progressive Tracks</p>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-3 h-3 text-indigo-500" />
                Streak Heatmap
              </div>
              <p className="text-xs text-slate-300 font-medium">GitHub-like grid</p>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-emerald-500" />
                Applications
              </div>
              <p className="text-xs text-slate-300 font-medium">Pipeline board</p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Authentication workspace */}
        <div className="flex-1 flex items-center justify-center p-8 lg:w-1/2">
          
          <div className="w-full max-w-[390px] bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative space-y-6">
            
            {/* Header branding on mobile view */}
            <div className="lg:hidden flex items-center justify-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Terminal className="w-4.5 h-4.5 text-cyan-400" />
              </div>
              <span className="font-mono text-xs font-bold tracking-widest text-slate-100 uppercase">
                PREP_TRACKER
              </span>
            </div>

            {/* Title */}
            <div className="space-y-2 text-center lg:text-left">
              <h3 className="text-xl font-bold tracking-tight text-slate-100">
                {forgotMode ? 'Reset Credentials' : isSignUp ? 'Begin Prep Journey' : 'Access Sandbox'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {forgotMode ? 'KEY_RECOVERY_PORTAL' : isSignUp ? 'INITIALIZE_NEW_PROFILE' : 'ENTER_DEVELOPER_CREDENTIALS'}
              </p>
            </div>

            {isLocalDev && (
              <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 text-center space-y-3">
                <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block font-bold">Local Dev Bypass Active</span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  The client is running in Guest mode (placeholders in env). Switch tabs directly or log in as guest.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase tracking-widest border border-amber-500/25 transition-all cursor-pointer"
                >
                  Enter as Guest
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Error & Success info alerts */}
            {errorMsg && (
              <div className="p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-350 text-xs leading-relaxed">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-355 text-xs leading-relaxed">
                {successMsg}
              </div>
            )}

            {!isLocalDev && !forgotMode && (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                
                {isSignUp && (
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-650">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition-all font-sans"
                      required={isSignUp}
                    />
                  </div>
                )}

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-650">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition-all font-sans"
                    required
                  />
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-650">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition-all font-sans"
                    required
                  />
                </div>

                {!isSignUp && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-[10px] font-mono text-slate-550 hover:text-cyan-400 uppercase tracking-widest transition-colors cursor-pointer"
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
                      {isSignUp ? 'INITIALIZE_PREP' : 'LAUNCH_SANDBOX'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {forgotMode && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-650">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="Registered Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition-all font-sans"
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
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-350 uppercase tracking-widest transition-colors cursor-pointer"
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
                  <span className="flex-shrink mx-3 text-[9px] font-mono text-slate-600 uppercase tracking-wider">or continue with</span>
                  <div className="flex-grow border-t border-slate-850"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-slate-100 hover:border-slate-700 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
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
                  className="text-[10px] font-mono text-slate-550 hover:text-cyan-400 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  {isSignUp ? 'Already registered? Sign In' : 'Create new workspace profile'}
                </button>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
};
