import { useState } from 'react';
import Icon from '../ui/Icon';

const formatINR = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function GoalSimulatorsSection() {
  // Wealth Growth SIP Simulator State
  const [monthlySip, setMonthlySip] = useState(10000);
  const [sipTenureYears, setSipTenureYears] = useState(10);
  const [expectedReturn, setExpectedReturn] = useState(12);

  // Target Corpus Planner State
  const [targetCorpus, setTargetCorpus] = useState(5000000);
  const [targetYears, setTargetYears] = useState(15);
  const [targetReturn, setTargetReturn] = useState(12);

  // Wealth Growth Calculation
  // FV = P * [((1 + i)^n - 1) / i] * (1 + i)
  const i = (expectedReturn / 100) / 12;
  const n = sipTenureYears * 12;
  const totalInvested = monthlySip * n;
  const finalCorpus = i > 0
    ? Math.round(monthlySip * (((Math.pow(1 + i, n) - 1) / i) * (1 + i)))
    : totalInvested;
  const wealthGained = Math.max(0, finalCorpus - totalInvested);

  // Target Corpus Calculation
  // Required Monthly SIP P = FV / ([((1 + i)^n - 1) / i] * (1 + i))
  const iTarget = (targetReturn / 100) / 12;
  const nTarget = targetYears * 12;
  const requiredSip = iTarget > 0
    ? Math.round(targetCorpus / (((Math.pow(1 + iTarget, nTarget) - 1) / iTarget) * (1 + iTarget)))
    : Math.round(targetCorpus / (nTarget || 1));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Simulator 1: SIP Wealth Growth Simulator */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card flex flex-col justify-between space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Icon name="trending_up" size={20} />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">SIP Wealth Growth Simulator</h3>
              <p className="text-xs text-outline">Calculate future wealth from recurring monthly SIP investments</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Monthly SIP Input */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-outline mb-1">
                <span className="uppercase tracking-wider">Monthly SIP Amount</span>
                <span className="text-primary font-bold">{formatINR(monthlySip)}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={monthlySip}
                onChange={(e) => setMonthlySip(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer"
              />
            </div>

            {/* Tenure Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-outline mb-1">
                <span className="uppercase tracking-wider">Investment Tenure</span>
                <span className="text-primary font-bold">{sipTenureYears} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="35"
                value={sipTenureYears}
                onChange={(e) => setSipTenureYears(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer"
              />
            </div>

            {/* Expected Return Rate Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-outline mb-1">
                <span className="uppercase tracking-wider">Expected Return Rate (% p.a.)</span>
                <span className="text-primary font-bold">{expectedReturn}%</span>
              </div>
              <input
                type="range"
                min="4"
                max="25"
                step="0.5"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-surface-container rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="bg-surface-container/60 rounded-xl p-4 border border-outline-variant/20 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-outline">Total Amount Invested:</span>
            <span className="font-bold text-on-surface">{formatINR(totalInvested)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-outline">Estimated Wealth Gain:</span>
            <span className="font-bold text-emerald-400">+{formatINR(wealthGained)}</span>
          </div>
          <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center">
            <span className="font-headline font-bold text-xs text-on-surface">Total Maturity Corpus:</span>
            <span className="font-headline font-bold text-lg text-sky-400">{formatINR(finalCorpus)}</span>
          </div>
        </div>
      </div>

      {/* Simulator 2: Target Corpus SIP Planner */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-card flex flex-col justify-between space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Icon name="ads_click" size={20} />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Target Goal SIP Calculator</h3>
              <p className="text-xs text-outline">Find required monthly SIP to achieve your target goal corpus</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Target Corpus Input */}
            <div>
              <label className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1">Target Corpus Goal (₹)</label>
              <input
                type="number"
                min="100000"
                step="500000"
                className="input-pill w-full text-sm font-bold text-emerald-400"
                value={targetCorpus}
                onChange={(e) => setTargetCorpus(Number(e.target.value))}
              />
            </div>

            {/* Target Years Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-outline mb-1">
                <span className="uppercase tracking-wider">Timeframe Goal</span>
                <span className="text-emerald-400 font-bold">{targetYears} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="35"
                value={targetYears}
                onChange={(e) => setTargetYears(Number(e.target.value))}
                className="w-full accent-emerald-400 h-2 bg-surface-container rounded-lg cursor-pointer"
              />
            </div>

            {/* Expected Return Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-outline mb-1">
                <span className="uppercase tracking-wider">Expected Return Rate (% p.a.)</span>
                <span className="text-emerald-400 font-bold">{targetReturn}%</span>
              </div>
              <input
                type="range"
                min="4"
                max="25"
                step="0.5"
                value={targetReturn}
                onChange={(e) => setTargetReturn(Number(e.target.value))}
                className="w-full accent-emerald-400 h-2 bg-surface-container rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Target Result Card */}
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 space-y-2 text-center">
          <p className="text-xs text-outline">Required Monthly Investment</p>
          <p className="font-headline font-bold text-2xl text-emerald-400">{formatINR(requiredSip)} <span className="text-xs text-outline font-normal">/ month</span></p>
          <p className="text-[11px] text-outline">To reach target corpus of <span className="font-bold text-on-surface">{formatINR(targetCorpus)}</span> in {targetYears} years @ {targetReturn}%</p>
        </div>
      </div>
    </div>
  );
}
