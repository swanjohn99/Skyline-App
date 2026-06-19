import { supabase } from '../supabaseClient';

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*, companies(name)')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Creates a company and makes the current user its owner (via RPC).
export async function createCompany(name, fullName) {
  const { data, error } = await supabase.rpc('create_company_and_join', {
    p_name: name,
    p_full_name: fullName || null,
  });
  if (error) throw error;
  return data;
}

export async function listMembers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setMemberActive(id, isActive) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function setMemberRole(id, role) {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id);
  if (error) throw error;
}
