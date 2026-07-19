import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  BookOpen, 
  Briefcase, 
  BarChart3, 
  Terminal
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Activity Log', path: '/log', icon: FileText },
    { name: 'Milestones', path: '/milestones', icon: CheckSquare },
    { name: 'Topics', path: '/topics', icon: BookOpen },
    { name: 'Applications', path: '/applications', icon: Briefcase },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  return (
    <div className="w-64 bg-panel border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
          <Terminal className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
            PREP_TRACKER
          </h1>
          <p className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest leading-none">
            v1.0.0 // LOCAL
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3.5 px-4 py-3 rounded-md font-sans text-sm font-medium transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-accent/10 text-accent border-l-2 border-accent' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent'}
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_#22D3EE]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-6 border-t border-slate-800 font-mono text-[10px] text-slate-500 space-y-1">
        <div>STATUS: ACTIVE</div>
        <div>DATABASE: LOCALHOST:3306</div>
        <div>MODE: DEVELOPMENT</div>
      </div>
    </div>
  );
};
