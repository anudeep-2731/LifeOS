import Icon from '../ui/Icon';
import { db } from '../../db/database';

const formatINR = (val) => '₹' + Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function getExpiryBadge(expiryDateStr) {
  if (!expiryDateStr) return <span className="text-outline text-xs">No Expiry</span>;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[11px]">🔴 Expired</span>;
  } else if (diffDays <= 30) {
    return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px]">⚠️ {diffDays} day{diffDays === 1 ? '' : 's'} left</span>;
  } else {
    return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium text-[11px]">🟢 {diffDays} days left</span>;
  }
}

export default function MasterPortfolioSection({ holdings = [], onAddHolding, onEditHolding, onDeleteHolding }) {
  const groups = [
    { name: 'Liquid Funds', title: 'Liquid Funds & Cash', color: 'text-emerald-400', icon: 'account_balance' },
    { name: 'Investments', title: 'Investments (FD, RD, MFs, Equity)', color: 'text-sky-400', icon: 'trending_up' },
    { name: 'Outside Money', title: 'Outside Money (Receivables / Lent)', color: 'text-amber-400', icon: 'handshake' },
    { name: 'Physical Assets', title: 'Physical Assets (Physical & Sovereign Gold)', color: 'text-purple-400', icon: 'diamond' },
    { name: 'Perks & Rewards', title: 'Perks & Rewards (Vouchers & Points)', color: 'text-amber-300', icon: 'card_giftcard' },
  ];

  return (
    <div className="space-y-6">
      {groups.map((grp) => {
        const items = holdings.filter(h => h.group === grp.name);
        const subtotal = items.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

        return (
          <div key={grp.name} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-card">
            {/* Group Header */}
            <div className="p-4 bg-surface-container/50 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center ${grp.color}`}>
                  <Icon name={grp.icon} size={18} />
                </div>
                <div>
                  <h3 className={`font-headline font-bold text-sm ${grp.color}`}>{grp.title}</h3>
                  <p className="text-[11px] text-outline">Subtotal: <span className="font-bold text-on-surface">{formatINR(subtotal)}</span></p>
                </div>
              </div>
              <button
                onClick={() => onAddHolding(grp.name)}
                className="btn-outline px-3 py-1 text-xs font-bold flex items-center gap-1 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Icon name="add" size={14} /> Add {grp.name.split(' ')[0]}
              </button>
            </div>

            {/* Holdings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/10 text-outline uppercase font-semibold">
                    <th className="py-2.5 px-4">Subcategory</th>
                    <th className="py-2.5 px-4">Platform / Entity</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-4">Date / Expiry</th>
                    {grp.name === 'Perks & Rewards' && <th className="py-2.5 px-4">Status</th>}
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={grp.name === 'Perks & Rewards' ? 6 : 5} className="py-4 px-4 text-center text-outline italic">
                        No holdings added under {grp.name} yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-on-surface">{item.type}</td>
                        <td className="py-3 px-4 text-primary font-medium">{item.platform}</td>
                        <td className="py-3 px-4 text-right font-headline font-bold text-on-surface">{formatINR(item.amount)}</td>
                        <td className="py-3 px-4 text-outline">{item.expiry || item.date || '-'}</td>
                        {grp.name === 'Perks & Rewards' && (
                          <td className="py-3 px-4">{getExpiryBadge(item.expiry)}</td>
                        )}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onEditHolding(item)}
                              className="p-1 text-outline hover:text-primary transition-colors"
                              title="Edit Holding"
                            >
                              <Icon name="edit" size={16} />
                            </button>
                            <button
                              onClick={() => onDeleteHolding(item.id)}
                              className="p-1 text-outline hover:text-error transition-colors"
                              title="Delete Holding"
                            >
                              <Icon name="delete" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
