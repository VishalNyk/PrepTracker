import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ActivityLogPage } from './pages/ActivityLog';
import { Milestones } from './pages/Milestones';
import { Topics } from './pages/Topics';
import { Applications } from './pages/Applications';
import { Analytics } from './pages/Analytics';

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="flex h-screen w-screen overflow-hidden bg-background text-slate-100 font-sans">
          {/* Persistent Sidebar */}
          <Sidebar />

          {/* Core Content Window */}
          <main className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/log" element={<ActivityLogPage />} />
              <Route path="/milestones" element={<Milestones />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/analytics" element={<Analytics />} />
              {/* Catch-all redirect to Dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
