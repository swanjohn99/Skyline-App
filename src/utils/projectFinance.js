export function hasQuotedTotal(amount) {
  if (amount == null || amount === '') return false;
  const n = Number(amount);
  return !Number.isNaN(n) && n > 0;
}

export function projectPending(project) {
  if (!hasQuotedTotal(project?.total_quoted_amount)) return null;
  const total = Number(project.total_quoted_amount) || 0;
  const received = Number(project.amount_received) || 0;
  return total - received;
}
