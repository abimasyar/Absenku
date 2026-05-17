import { supabase } from './supabase.js';
import { isDemoMode, demoGetProfile, demoGetSchool } from './demo.js';

let currentProfile = null;

export async function getSession() {
  if (isDemoMode()) return { user: { id: 'demo' } };
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getProfile() {
  if (isDemoMode()) return demoGetProfile();
  if (currentProfile) return currentProfile;
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, school_id, nip, name, email, role, avatar_url')
    .eq('id', session.user.id)
    .single();
  if (error || !data) return null;
  currentProfile = data;
  return currentProfile;
}

export async function getSchool() {
  if (isDemoMode()) return demoGetSchool();
  const profile = await getProfile();
  if (!profile) return null;
  const { data } = await supabase
    .from('schools')
    .select('id, name, address')
    .eq('id', profile.school_id)
    .single();
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentProfile = null;
  return data;
}

export async function signOut() {
  if (isDemoMode()) {
    const { disableDemo } = await import('./demo.js');
    disableDemo();
    return;
  }
  await supabase.auth.signOut();
  currentProfile = null;
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') currentProfile = null;
    callback(event, session);
  });
  return () => subscription.unsubscribe();
}

export async function isAuthenticated() {
  if (isDemoMode()) return true;
  const session = await getSession();
  return !!session;
}

export function clearProfileCache() {
  currentProfile = null;
}

/**
 * Daftar akun baru — buat auth user + row di tabel users & schools
 */
export async function signUp({ name, email, password, nip, schoolName, schoolAddress }) {
  // 1. Buat auth user
  const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
  if (authErr) throw authErr;
  const userId = authData.user?.id;
  if (!userId) throw new Error('Gagal membuat akun');

  // 2. Buat sekolah baru
  const { data: schoolData, error: schoolErr } = await supabase
    .from('schools')
    .insert({ name: schoolName.trim(), address: schoolAddress?.trim() || '' })
    .select()
    .single();
  if (schoolErr) throw new Error('Gagal membuat data sekolah: ' + schoolErr.message);

  // 3. Buat profil user
  const { error: profileErr } = await supabase
    .from('users')
    .insert({
      id: userId,
      school_id: schoolData.id,
      name: name.trim(),
      email: email.trim(),
      nip: nip?.trim() || null,
      role: 'guru',
    });
  if (profileErr) throw new Error('Gagal membuat profil: ' + profileErr.message);

  return authData;
}
