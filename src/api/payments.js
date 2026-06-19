import { supabase } from '../supabaseClient';

export async function listPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, payment_date, projects(project_title, client_name)')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPayment(payment) {
  const { error } = await supabase.from('payments').insert(payment);
  if (error) throw error;
}
