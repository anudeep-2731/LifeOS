import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import DashboardTab from './views/DashboardTab';
import ScheduleTab from './views/ScheduleTab';
import StudioTab from './views/StudioTab';
import ExpensesTab from './views/ExpensesTab';
import PortfolioTab from './views/PortfolioTab';
import CirclesTab from './views/CirclesTab';
import AuthView from './views/AuthView';
import OnboardingModal from './components/onboarding/OnboardingModal';
import { getSupabase, migrateLocalDataToSupabase, fetchCloudSetting } from './lib/supabase';

function AppContent() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleOpenOnboarding = () => setShowOnboarding(true);
    window.addEventListener('open-onboarding', handleOpenOnboarding);
    return () => window.removeEventListener('open-onboarding', handleOpenOnboarding);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const client = await getSupabase();
      if (client) {
        const { data: { session: currentSession } } = await client.auth.getSession();
        setSession(currentSession);
        if (currentSession) {
          await migrateLocalDataToSupabase();
          // Check onboarding
          const hasOnboarded = await fetchCloudSetting('has_onboarded', false);
          if (!hasOnboarded) {
            setShowOnboarding(true);
          }
        }

        const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, newSession) => {
          setSession(newSession);
          if (newSession) {
            await migrateLocalDataToSupabase();
            const hasOnboarded = await fetchCloudSetting('has_onboarded', false);
            if (!hasOnboarded) {
              setShowOnboarding(true);
            }
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
            path="/studio"
            element={session ? <StudioTab /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/schedule"
            element={<Navigate to="/studio" replace />}
          />
          <Route
            path="/expenses"
            element={session ? <ExpensesTab /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/portfolio"
            element={session ? <PortfolioTab /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/circles"
            element={session ? <CirclesTab /> : <Navigate to="/login" replace />}
          />

          {/* Legacy route redirects */}
          <Route path="/money"     element={<Navigate to="/expenses" replace />} />
          <Route path="/morning"   element={<Navigate to="/studio" replace />} />
          <Route path="/tasks"     element={<Navigate to="/studio" replace />} />
          <Route path="/today"     element={<Navigate to="/dashboard" replace />} />
          <Route path="/nutrition" element={<Navigate to="/dashboard" replace />} />
          <Route path="/"          element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </main>
      {!isAuthPage && session && <BottomNav />}

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onCompleted={() => {
          setShowOnboarding(false);
          window.location.reload();
        }}
      />
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
