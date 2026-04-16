import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import DashboardTab from './views/DashboardTab';
import MorningTab from './views/MorningTab';
import MealsTab from './views/MealsTab';
import NutritionTab from './views/NutritionTab';
import TasksTab from './views/TasksTab';
import EnergyTab from './views/EnergyTab';
import MoneyTab from './views/MoneyTab';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="pt-16 pb-32">
          <Routes>
            <Route path="/dashboard"  element={<DashboardTab />} />
            <Route path="/morning"    element={<MorningTab />} />
            <Route path="/meals"      element={<MealsTab />} />
            <Route path="/nutrition"  element={<NutritionTab />} />
            <Route path="/tasks"      element={<TasksTab />} />
            <Route path="/energy"     element={<EnergyTab />} />
            <Route path="/money"      element={<MoneyTab />} />
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
