import { useState, useEffect, useCallback } from 'react';
import Icon from '../components/ui/Icon';
import HoldingModal from '../components/ui/HoldingModal';
import ExecutiveOverviewSection from '../components/finance/ExecutiveOverviewSection';
import MasterPortfolioSection from '../components/finance/MasterPortfolioSection';
import STIMatrixSection from '../components/finance/STIMatrixSection';
import { 
  computeCloudPortfolioNetWorth, 
  getCloudExpiringPerks, 
  deleteCloudHolding 
} from '../lib/supabase';
import { cn } from '../lib/utils';

export default function PortfolioTab() {
  const [holdings, setHoldings] = useState([]);
  const [metrics, setMetrics] = useState({ liquid: 0, invested: 0, outside: 0, gold: 0, perks: 0, financialNetWorth: 0, combinedNetWorth: 0, allocations: [] });
  const [expiringPerks, setExpiringPerks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'portfolio' | 'sti'
  const [showHoldingModal, setShowHoldingModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState(null);
  const [defaultHoldingGroup, setDefaultHoldingGroup] = useState('Liquid Funds');

  const subTabs = [
    { id: 'overview', label: 'Overview', icon: 'pie_chart' },
    { id: 'portfolio', label: 'Holdings', icon: 'account_balance' },
    { id: 'sti', label: 'STI Matrix', icon: 'bolt' },
  ];

  const refreshPortfolio = useCallback(async () => {
    setLoading(true);
    try {
      const [portData, expPerks] = await Promise.all([
        computeCloudPortfolioNetWorth(),
        getCloudExpiringPerks(30),
      ]);
      setMetrics(portData);
      setHoldings(portData.holdings || []);
      setExpiringPerks(expPerks);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);

  const handleOpenAddHolding = (groupName = 'Liquid Funds') => {
    setEditingHolding(null);
    setDefaultHoldingGroup(groupName);
    setShowHoldingModal(true);
  };

  const handleEditHolding = (item) => {
    setEditingHolding(item);
    setDefaultHoldingGroup(item.group || 'Liquid Funds');
    setShowHoldingModal(true);
  };

  const handleDeleteHolding = async (id) => {
    await deleteCloudHolding(id);
    await refreshPortfolio();
  };

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Top Header & Sub-Tabs */}
      <div className="pt-4 px-4 sm:px-6 pb-3 bg-surface-container-low border-b border-outline-variant/20 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Icon name="account_balance" size={20} />
            </div>
            <div>
              <h2 className="font-headline font-bold text-base text-on-surface">Wealth Portfolio</h2>
              <p className="text-xs text-outline">Net worth tracking, holdings & simulators</p>
            </div>
          </div>

        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex bg-surface-container-high rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                'px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex-1 text-center flex items-center justify-center gap-1.5',
                activeSubTab === tab.id
                  ? 'bg-surface shadow-sm text-primary font-bold'
                  : 'text-outline hover:text-on-surface'
              )}
            >
              <Icon name={tab.icon} size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="px-4 sm:px-6 pt-5">
        {activeSubTab === 'overview' && (
          <ExecutiveOverviewSection
            portfolio={metrics}
            expiringPerks={expiringPerks}
            onNavigateToPerks={() => setActiveSubTab('portfolio')}
            onOpenAddHolding={handleOpenAddHolding}
          />
        )}

        {activeSubTab === 'portfolio' && (
          <MasterPortfolioSection
            holdings={holdings}
            onAddHolding={handleOpenAddHolding}
            onEditHolding={handleEditHolding}
            onDeleteHolding={handleDeleteHolding}
          />
        )}

        {activeSubTab === 'sti' && <STIMatrixSection />}
      </div>

      {/* FAB Add Holding Button */}
      <button
        onClick={() => handleOpenAddHolding()}
        className="fixed bottom-[95px] right-6 w-14 h-14 rounded-full primary-gradient text-white shadow-gradient flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
        aria-label="Add Holding"
      >
        <Icon name="add" size={28} filled className="text-white" />
      </button>

      {/* Modals */}
      <HoldingModal
        isOpen={showHoldingModal}
        onClose={() => setShowHoldingModal(false)}
        initialData={editingHolding}
        defaultGroup={defaultHoldingGroup}
        onSave={refreshPortfolio}
      />
    </div>
  );
}
