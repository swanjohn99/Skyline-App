const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const amountFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactInrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatCurrency(value) {
  return inrFormatter.format(Number(value) || 0);
}

export function formatAmount(value) {
  return amountFormatter.format(Number(value) || 0);
}

export function formatCompactCurrency(value) {
  return compactInrFormatter.format(Number(value) || 0);
}

export function formatDate(dateString) {
  if (!dateString) return '\u2014';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// For <input type="date"> values.
export function toDateInputValue(dateString) {
  if (!dateString) return '';
  return String(dateString).split('T')[0];
}

export function todayInputValue() {
  return new Date().toISOString().split('T')[0];
}
