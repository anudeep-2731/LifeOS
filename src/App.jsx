import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import DashboardTab from './views/DashboardTab';
import ScheduleTab from './views/ScheduleTab';
import ExpensesTab from './views/ExpensesTab';
import PortfolioTab from './views/PortfolioTab';
import AuthView from './views/AuthView';
import { getSupabase, migrateLocalDataToSupabase } from './lib/supabase';

function AppContent() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      const client = await getSupabase();
      if (client) {
        const { data: { session: currentSession } } = await client.auth.getSession();
        setSession(currentSession);
        if (currentSession) {
          await migrateLocalDataToSupabase();
        }

        const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, newSession) => {
          setSession(newSession);
          if (newSession) {
            await migrateLocalDataToSupabase();
          }
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <div className="animate-spin text-primary text-2xl font-bold">LifeOS...</div>
      </div>
    );
  }

  const isAuthPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-background">
      {!isAuthPage && session && <TopBar />}
      <main className={!isAuthPage && session ? 'pt-16 pb-32' : ''}>
        <Routes>
          <Route path="/login" element={<AuthView onAuthSuccess={() => {}} />} />

          <Route
            path="/dashboard"
            element={session ? <DashboardTab /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/schedule"
            element={session ? <ScheduleTab /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/expenses"
            element={session ? <ExpensesTab /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/portfolio"
            element={session ? <PortfolioTab /> : <Navigate to="/login" replace />}
          />

          {/* Legacy route redirects */}
          <Route path="/money"     element={<Navigate to="/expenses" replace />} />
          <Route path="/morning"   element={<Navigate to="/schedule" replace />} />
          <Route path="/tasks"     element={<Navigate to="/schedule" replace />} />
          <Route path="/nutrition" element={<Navigate to="/dashboard" replace />} />
          <Route path="/"          element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </main>
      {!isAuthPage && session && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
