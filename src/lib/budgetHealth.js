/**
 * Budget Health & Daily Burn Rate Calculator
 */

const DEFAULT_EMOJIS = {
  Food: '🍔',
  Groceries: '🛒',
  Dining: '🍽️',
  Housing: '🏠',
  Rent: '🏠',
  Transport: '🚗',
  Travel: '✈️',
  Fitness: '💪',
  Health: '🏥',
  Fun: '🎮',
  Entertainment: '🍿',
  Shopping: '🛍️',
  Utilities: '⚡',
  Subscriptions: '📺',
  Bills: '📄',
  Education: '📚',
  Other: '💸',
};

export function calculateBudgetMetrics(expenses = [], monthlyBudget = 30000, todayStr = '', categoryConfig = []) {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = dateObj.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay + 1);

  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const todaySpent = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const budgetRemaining = Math.max(0, monthlyBudget - totalSpent);
  const safeSpendToday = Math.round(budgetRemaining / daysRemaining);

  const targetSpentToDate = (monthlyBudget / daysInMonth) * currentDay;
  const isOnTrack = totalSpent <= targetSpentToDate;
  const paceBufferPercent = Math.round(((targetSpentToDate - totalSpent) / Math.max(1, monthlyBudget)) * 100);

  // Dynamically group expenses by category
  const categoryTotals = {};

  // Initialize with custom category config if provided
  if (categoryConfig && categoryConfig.length > 0) {
    categoryConfig.forEach(cat => {
      const name = cat.name || cat;
      categoryTotals[name] = { spent: 0, target: cat.budget || Math.round(monthlyBudget / categoryConfig.length), icon: cat.icon || 'more_horiz', emoji: cat.emoji };
    });
  }

  expenses.forEach((e) => {
    const catName = e.category || 'Other';
    if (!categoryTotals[catName]) {
      categoryTotals[catName] = {
        spent: 0,
        target: Math.round(monthlyBudget * 0.2), // Default target allocation
        emoji: DEFAULT_EMOJIS[catName] || '💸',
      };
    }
    categoryTotals[catName].spent += Number(e.amount) || 0;
  });

  // If no expenses or categories exist yet, provide realistic starter envelopes
  if (Object.keys(categoryTotals).length === 0) {
    const defaultEnvelopes = [
      { name: 'Food & Dining', emoji: '🍔', spent: 0, limit: Math.round(monthlyBudget * 0.3) },
      { name: 'Housing & Bills', emoji: '🏠', spent: 0, limit: Math.round(monthlyBudget * 0.35) },
      { name: 'Transport', emoji: '🚗', spent: 0, limit: Math.round(monthlyBudget * 0.15) },
      { name: 'Fun & Lifestyle', emoji: '🎮', spent: 0, limit: Math.round(monthlyBudget * 0.2) },
    ];
    defaultEnvelopes.forEach(env => {
      categoryTotals[env.name] = { spent: env.spent, target: env.limit, emoji: env.emoji };
    });
  }

  const envelopes = Object.entries(categoryTotals).map(([name, item]) => {
    const limit = item.target || Math.round(monthlyBudget * 0.2);
    const spent = item.spent || 0;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    let status = 'secondary'; // green
    if (pct >= 80 && pct <= 100) status = 'tertiary'; // amber
    if (pct > 100) status = 'error'; // red

    return {
      name,
      emoji: item.emoji || DEFAULT_EMOJIS[name] || '💸',
      icon: item.icon,
      spent,
      limit,
      percent: pct,
      status,
    };
  });

  // Sort envelopes by highest spent
  envelopes.sort((a, b) => b.spent - a.spent);

  return {
    totalSpent,
    todaySpent,
    budgetRemaining,
    safeSpendToday,
    isOnTrack,
    paceBufferPercent,
    envelopes,
  };
}
