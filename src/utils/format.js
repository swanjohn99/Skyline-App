const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const compactInrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value) {
  return inrFormatter.format(Number(value) || 0);
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
