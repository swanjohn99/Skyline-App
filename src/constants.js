export const EXPENSE_TYPES = [
  { value: 'material', label: 'Material' },
  { value: 'labour', label: 'Labour payment' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'other', label: 'Others' },
];

export function expenseTypeLabel(value) {
  return EXPENSE_TYPES.find((t) => t.value === value)?.label ?? 'Others';
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'online_transfer', label: 'Online transfer' },
  { value: 'cheque', label: 'Cheque' },
];

export function paymentMethodLabel(value) {
  return PAYMENT_METHODS.find((t) => t.value === value)?.label ?? '—';
}

export const CLIENT_TYPES = [
  { value: 'b2c', label: 'B2C' },
  { value: 'b2b', label: 'B2B' },
];

export function clientTypeLabel(value) {
  const normalized = value === 'private_client' ? 'b2c' : value === 'contractor' ? 'b2b' : value;
  return CLIENT_TYPES.find((t) => t.value === normalized)?.label ?? 'B2C';
}

export function isB2BClient(client) {
  const type = client?.client_type;
  return type === 'b2b' || type === 'contractor';
}

export function clientDisplayName(client) {
  if (!client) return '';
  if (isB2BClient(client) && client.customer_account?.name) {
    return `${client.name} (${client.customer_account.name})`;
  }
  return client.name;
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MEMBER: 'member',
};

export const PROJECT_STATUSES = [
  'site visit requested',
  'site visit done',
  'quotation sent',
  'work started',
  'work completed',
  'completed',
  'rejected',
];

// Statuses that mean the project is no longer active work.
export const CLOSED_STATUSES = ['completed', 'rejected'];

// Statuses that count as work delivered (used for profit / completion logic).
export const COMPLETED_STATUSES = ['work completed', 'completed'];

export function isClosedStatus(status) {
  return CLOSED_STATUSES.includes((status ?? '').toLowerCase().trim());
}

export function isCompletedStatus(status) {
  return COMPLETED_STATUSES.includes((status ?? '').toLowerCase().trim());
}

const STATUS_BADGE_MAP = {
  'site visit requested': 'status-badge--site-visit-requested',
  'site visit done': 'status-badge--site-visit-done',
  'quotation sent': 'status-badge--quotation',
  'work started': 'status-badge--work-started',
  'work completed': 'status-badge--work-completed',
  completed: 'status-badge--completed',
  rejected: 'status-badge--rejected',
};

export function statusBadgeClass(status) {
  const normalized = (status ?? '').toLowerCase().trim();
  return `status-badge ${STATUS_BADGE_MAP[normalized] ?? 'status-badge--default'}`;
}

export const CHART_COLORS = {
  income: '#10b981',
  expenses: '#f87171',
};

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
