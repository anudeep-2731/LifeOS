import { useState } from 'react';
import Icon from '../ui/Icon';

const STI_OPTIONS = [
  { option: 'Savings Account', desc: 'Bank account interest', returnRate: 4.0, risk: 'Very Low', liq: 'Instant Access', taxRule: 'Slab', horizon: '0-90D', tag: '0 - 30 Days' },
  { option: 'Short-Term Debt Funds (0-90D)', desc: 'Low-risk bond funds', returnRate: 6.5, risk: 'Very Low', liq: 'T+1 / T+2', taxRule: 'Slab', horizon: '0-90D', tag: '1 - 3 Months' },
  { option: 'Fixed Deposits & RDs', desc: 'Bank term deposit', returnRate: 7.0, risk: 'Very Low', liq: 'Locked / Penalty', taxRule: 'Slab', horizon: '90D-3Y', tag: '6M - 3 Years' },
  { option: 'Arbitrage Mutual Funds', desc: 'Exploits cash & futures gap', returnRate: 7.5, risk: 'Very Low', liq: 'T+3', taxRule: 'Equity', horizon: '90D-3Y', tag: '3M - 3 Years (Tax Efficient)' },
  { option: 'Short-Term Debt Funds (1-3Y)', desc: 'Corporate/Govt bond funds', returnRate: 8.4, risk: 'Low-Mod', liq: 'T+1 / T+2', taxRule: 'Slab', horizon: '1-3Y+', tag: '1 - 3 Years' },
  { option: 'Equity Savings Funds', desc: '65% Equity, 15% Bond, 20% Arb', returnRate: 11.8, risk: 'Low', liq: 'T+1 / T+2', taxRule: 'Equity', horizon: '1-3Y+', tag: '1 - 3+ Years' },
  { option: 'Conservative Hybrid Funds', desc: '10-25% Equity, rest Bonds', returnRate: 11.3, risk: 'Low-Mod', liq: 'T+1 / T+2', taxRule: 'Hybrid', horizon: '1-3Y+', tag: '3+ Years' },
];

const formatINR = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function STIMatrixSection() {
  const [capital, setCapital] = useState(100000);
  const [tenureMonths, setTenureMonths] = useState(6);
  const [filterHorizon, setFilterHorizon] = useState('ALL');

  const filteredOptions = filterHorizon === 'ALL'
    ? STI_OPTIONS
    : STI_OPTIONS.filter(o => o.horizon === filterHorizon);

  return (
    <div className="space-y-6">
      {/* Simulation Controller Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Icon name="bolt" size={20} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-on-surface">Short-Term Investment Yield Simulator</h3>
            <p className="text-xs text-outline">Compare expected returns across low-risk cash parking instruments</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Capital Input */}
          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Capital Amount (₹)</label>
            <input
              type="number"
              min="1000"
              step="5000"
              className="input-pill w-full text-sm font-bold text-primary"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
            />
          </div>

          {/* Tenure Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-outline mb-1.5">
              <span className="uppercase tracking-wider">Holding Tenure</span>
              <span className="text-primary font-bold">{tenureMonths} Month{tenureMonths > 1 ? 's' : ''} ({(tenureMonths * 30)} Days)</span>
            </div>
            <input
              type="range"
              min="1"
              max="36"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer"
            />
          </div>

          {/* Horizon Filter */}
          <div>
            <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">Filter Horizon</label>
            <select
              className="input-pill w-full text-sm font-medium"
              value={filterHorizon}
              onChange={(e) => setFilterHorizon(e.target.value)}
            >
              <option value="ALL">All Horizons (0D - 3Y+)</option>
              <option value="0-90D">0 - 90 Days (Ultra Short-Term)</option>
              <option value="90D-3Y">90 Days - 3 Years (Medium Short-Term)</option>
              <option value="1-3Y+">1 - 3+ Years (Extended Short-Term)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-card">
        <div className="p-4 bg-surface-container/50 border-b border-outline-variant/20 flex items-center justify-between">
          <h4 className="font-headline font-bold text-sm text-on-surface">STI Options Decision Matrix</h4>
          <span className="text-xs text-outline">Simulated for {formatINR(capital)} over {tenureMonths} months</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-outline-variant/10 text-outline uppercase font-semibold">
                <th className="py-3 px-4">Instrument Option</th>
                <th className="py-3 px-4 text-center">Expected Return</th>
                <th className="py-3 px-4">Risk & Liquidity</th>
                <th className="py-3 px-4">Taxation Rule</th>
                <th className="py-3 px-4 text-right">Est. Interest Gain</th>
                <th className="py-3 px-4 text-right font-bold text-on-surface">Total Estimated Maturity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredOptions.map((opt, i) => {
                const annualRate = opt.returnRate / 100;
                const timeInYears = tenureMonths / 12;
                const estGain = Math.round(capital * annualRate * timeInYears);
                const maturity = capital + estGain;

                return (
                  <tr key={i} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-on-surface text-sm">{opt.option}</p>
                      <p className="text-[11px] text-outline mt-0.5">{opt.desc} &bull; <span className="text-amber-400 font-medium">{opt.tag}</span></p>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-headline font-bold text-xs">
                        {opt.returnRate}% p.a.
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-on-surface">{opt.risk} Risk</p>
                      <p className="text-[11px] text-outline">{opt.liq}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${opt.taxRule === 'Equity' ? 'bg-sky-500/15 text-sky-400' : 'bg-surface-container text-outline'}`}>
                        {opt.taxRule}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-headline font-bold text-emerald-400">
                      +{formatINR(estGain)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-headline font-bold text-on-surface text-sm">
                      {formatINR(maturity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
