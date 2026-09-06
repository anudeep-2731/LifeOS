import Icon from '../ui/Icon';

const formatINR = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function ExecutiveOverviewSection({ portfolio, expiringPerks, onNavigateToPerks, onOpenAddHolding }) {
  const { liquid, invested, outside, gold, perks, financialNetWorth, combinedNetWorth } = portfolio;

  const totalForShare = combinedNetWorth || 1;
  const liquidPct = ((liquid / totalForShare) * 100).toFixed(1);
  const investedPct = ((invested / totalForShare) * 100).toFixed(1);
  const outsidePct = ((outside / totalForShare) * 100).toFixed(1);
  const goldPct = ((gold / totalForShare) * 100).toFixed(1);

  return (
    <div className="space-y-5">
      {/* Perk / Voucher Expiry Notification Banner */}
      {expiringPerks && expiringPerks.length > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-on-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
              <Icon name="warning" size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-400">Voucher / Perk Expiry Alert!</h4>
              <p className="text-xs text-outline mt-0.5">
                {expiringPerks.map(p => `${p.type} (${p.platform}) expires in ${p.diffDays} day${p.diffDays === 1 ? '' : 's'}`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToPerks}
            className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors flex-shrink-0"
          >
            View Perks
          </button>
        </div>
      )}

      {/* Dual Net Worth Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Combined Net Worth */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card">
          <div className="flex items-center justify-between text-outline text-xs font-semibold uppercase tracking-wider">
            <span>Total Combined Net Worth</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="account_balance_wallet" size={18} />
            </div>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface mt-2">{formatINR(combinedNetWorth)}</p>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">Liquid + Invested + Gold + Receivables</p>
        </div>

        {/* Financial Cash Net Worth */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-emerald-500/20 shadow-card">
          <div className="flex items-center justify-between text-outline text-xs font-semibold uppercase tracking-wider">
            <span>Financial / Cash Net Worth</span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Icon name="payments" size={18} />
            </div>
          </div>
          <p className="text-2xl font-headline font-bold text-emerald-400 mt-2">{formatINR(financialNetWorth)}</p>
          <p className="text-[11px] text-outline mt-1">Excludes Physical Gold</p>
        </div>

        {/* Total Investments */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card">
          <div className="flex items-center justify-between text-outline text-xs font-semibold uppercase tracking-wider">
            <span>Total Investments</span>
            <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
              <Icon name="show_chart" size={18} />
            </div>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface mt-2">{formatINR(invested)}</p>
          <p className="text-[11px] text-outline mt-1">MFs, FDs, RDs & Stocks</p>
        </div>

        {/* Liquid Funds */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card">
          <div className="flex items-center justify-between text-outline text-xs font-semibold uppercase tracking-wider">
            <span>Liquid Cash & Bank</span>
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <Icon name="account_balance" size={18} />
            </div>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface mt-2">{formatINR(liquid)}</p>
          <p className="text-[11px] text-outline mt-1">Cash & Savings Accounts</p>
        </div>
      </div>

      {/* Asset Distribution & Group Breakdown */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-bold text-base text-on-surface">Asset Allocation Breakdown</h3>
          <button
            onClick={() => onOpenAddHolding()}
            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
          >
            <Icon name="add" size={16} /> Add Asset
          </button>
        </div>

        <div className="space-y-3.5">
          {/* Liquid Funds Row */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-emerald-400">Liquid Funds (Cash, HDFC, SBI)</span>
              <span className="font-bold text-on-surface">{formatINR(liquid)} <span className="text-outline text-[11px]">({liquidPct}%)</span></span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(liquidPct, 100)}%` }}></div>
            </div>
          </div>

          {/* Investments Row */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-sky-400">Investments (FD, RD, MFs, Equity)</span>
              <span className="font-bold text-on-surface">{formatINR(invested)} <span className="text-outline text-[11px]">({investedPct}%)</span></span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.min(investedPct, 100)}%` }}></div>
            </div>
          </div>

          {/* Outside Money Row */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-amber-400">Outside Money (Receivables/Lent)</span>
              <span className="font-bold text-on-surface">{formatINR(outside)} <span className="text-outline text-[11px]">({outsidePct}%)</span></span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(outsidePct, 100)}%` }}></div>
            </div>
          </div>

          {/* Physical Assets Row */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-purple-400">Physical Assets (Physical & Sovereign Gold)</span>
              <span className="font-bold text-on-surface">{formatINR(gold)} <span className="text-outline text-[11px]">({goldPct}%)</span></span>
            </div>
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(goldPct, 100)}%` }}></div>
            </div>
          </div>

          {/* Perks & Rewards */}
          <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center text-xs">
            <span className="font-semibold text-amber-300">Active Perks, Rewards & Vouchers</span>
            <span className="font-bold text-amber-300">{formatINR(perks)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
