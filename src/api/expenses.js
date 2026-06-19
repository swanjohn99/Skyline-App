import { supabase } from '../supabaseClient';

export async function listExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, amount, description, expense_date, projects(project_title, client_name)')
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listExpensesByProject(projectId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(expense) {
  const { error } = await supabase.from('expenses').insert(expense);
  if (error) throw error;
}
