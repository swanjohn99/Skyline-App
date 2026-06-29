import { EXPENSE_TYPES } from '../constants';

const TYPE_KEYS = EXPENSE_TYPES.map((t) => t.value);

export const BREAKDOWN_COLORS = {
  material: '#3b82f6',
  labour: '#f59e0b',
  transportation: '#8b5cf6',
  other: '#94a3b8',
  profit: '#10b981',
  loss: '#ef4444',
};

const SHORT_LABELS = {
  material: 'Material',
  labour: 'Labour',
  transportation: 'Transportation',
  other: 'Others',
};

export function computeFinancialBreakdown(expenses, income) {
  const amounts = Object.fromEntries(TYPE_KEYS.map((k) => [k, 0]));

  for (const expense of expenses) {
    const type = TYPE_KEYS.includes(expense.expense_type) ? expense.expense_type : 'other';
    amounts[type] += Number(expense.amount) || 0;
  }

  const totalExpenses = TYPE_KEYS.reduce((sum, key) => sum + amounts[key], 0);
  const received = Number(income) || 0;
  const profit = received - totalExpenses;

  const expenseSegments = TYPE_KEYS.map((key) => ({
    key,
    label: SHORT_LABELS[key],
    amount: amounts[key],
    color: BREAKDOWN_COLORS[key],
    spendPercent: totalExpenses > 0 ? (amounts[key] / totalExpenses) * 100 : 0,
    incomePercent: received > 0 ? (amounts[key] / received) * 100 : 0,
  }));

  const profitPercent = received > 0 ? (profit / received) * 100 : null;

  return {
    expenseSegments,
    totalExpenses,
    received,
    profit,
    profitPercent,
    hasData: totalExpenses > 0 || received > 0,
  };
}

/** Pie slices sized by % of income received (expense categories + profit). */
export function getIncomePieSegments(expenses, income) {
  const breakdown = computeFinancialBreakdown(expenses, income);
  const { expenseSegments, profit, received, profitPercent, totalExpenses } = breakdown;

  if (!breakdown.hasData) {
    return { segments: [], ...breakdown, lossMode: false, noIncome: received <= 0 };
  }

  if (received <= 0 && totalExpenses > 0) {
    const segments = expenseSegments
      .filter((s) => s.amount > 0)
      .map((s) => ({
        key: s.key,
        label: s.label,
        amount: s.amount,
        color: s.color,
        incomePercent: null,
        anglePercent: s.spendPercent,
      }));
    return { segments, ...breakdown, lossMode: false, noIncome: true };
  }

  if (profit < 0) {
    const segments = expenseSegments
      .filter((s) => s.amount > 0)
      .map((s) => ({
        key: s.key,
        label: s.label,
        amount: s.amount,
        color: s.color,
        incomePercent: (s.amount / received) * 100,
        anglePercent: totalExpenses > 0 ? (s.amount / totalExpenses) * 100 : 0,
      }));
    return { segments, ...breakdown, lossMode: true, noIncome: false };
  }

  const segments = expenseSegments
    .filter((s) => s.amount > 0)
    .map((s) => ({
      key: s.key,
      label: s.label,
      amount: s.amount,
      color: s.color,
      incomePercent: (s.amount / received) * 100,
      anglePercent: (s.amount / received) * 100,
    }));

  if (profit > 0) {
    segments.push({
      key: 'profit',
      label: 'Profit',
      amount: profit,
      color: BREAKDOWN_COLORS.profit,
      incomePercent: profitPercent,
      anglePercent: profitPercent,
    });
  }

  return { segments, ...breakdown, lossMode: false, noIncome: false };
}
