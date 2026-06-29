import { api } from '../apiClient';

export async function listLoanRepayments(loanId) {
  const query = loanId ? `?loan_id=${encodeURIComponent(loanId)}` : '';
  return (await api.get(`/loan-repayments${query}`)) ?? [];
}

export async function createLoanRepayment(repayment) {
  return api.post('/loan-repayments', repayment);
}

export async function updateLoanRepayment(id, changes) {
  await api.patch(`/loan-repayments/${id}`, changes);
}

export async function deleteLoanRepayment(id) {
  await api.del(`/loan-repayments/${id}`);
}
