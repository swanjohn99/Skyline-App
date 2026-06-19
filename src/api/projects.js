import { supabase } from '../supabaseClient';
import { CLOSED_STATUSES } from '../constants';

export async function listProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// Projects that can still receive expenses/payments (not completed/rejected).
export async function listOpenProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_title, client_name, status')
    .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProject(project) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id, changes) {
  const { error } = await supabase
    .from('projects')
    .update(changes)
    .eq('id', id);
  if (error) throw error;
}
