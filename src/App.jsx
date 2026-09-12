import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import TodayScreen from './views/TodayScreen';
import GangScreen from './views/GangScreen';
import MoneyScreen from './views/MoneyScreen';
import RoutineStudioScreen from './views/RoutineStudioScreen';
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
        <div className="animate-spin text-primary text-2xl font-bold font-headline">LifeOS...</div>
      </div>
    );
  }

  const isAuthPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {!isAuthPage && session && <TopBar />}
      <main className={!isAuthPage && session ? 'pt-16 pb-28' : ''}>
        <Routes>
          <Route path="/login" element={<AuthView onAuthSuccess={() => {}} />} />

          {/* Primary 3-Tab Routes */}
          <Route
            path="/today"
            element={session ? <TodayScreen /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/gang"
            element={session ? <GangScreen /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/money"
            element={session ? <MoneyScreen /> : <Navigate to="/login" replace />}
          />

          {/* Sub-screen & Routine Studio */}
          <Route
            path="/routine-studio"
            element={session ? <RoutineStudioScreen /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/expenses-history"
            element={session ? <ExpensesTab /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/portfolio"
            element={session ? <PortfolioTab /> : <Navigate to="/login" replace />}
          />

          {/* Legacy route redirects for backwards compatibility */}
          <Route path="/dashboard" element={<Navigate to="/today" replace />} />
          <Route path="/schedule"  element={<Navigate to="/routine-studio" replace />} />
          <Route path="/circles font-bold"   element={<Navigate to="/gang" replace />} />
          <Route path="/circles"   element={<Navigate to="/gang" replace />} />
          <Route path="/expenses"  element={<Navigate to="/money" replace />} />
          <Route path="/morning"   element={<Navigate to="/routine-studio" replace />} />
          <Route path="/tasks"     element={<Navigate to="/routine-studio" replace />} />
          <Route path="/nutrition" element={<Navigate to="/today" replace />} />
          <Route path="/"          element={<Navigate to={session ? "/today" : "/login"} replace />} />
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
