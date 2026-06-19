import { supabase } from '../supabaseClient';

export async function listClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClient(client) {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(id, changes) {
  const { error } = await supabase
    .from('clients')
    .update(changes)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteClient(id) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
