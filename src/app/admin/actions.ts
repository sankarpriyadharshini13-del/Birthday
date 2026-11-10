'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Every action re-verifies the caller is an admin. Never trust the UI. */
async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const { data } = await supabase.from('profiles').select('role, is_blocked').eq('id', user.id).single();
  if (data?.role !== 'admin' || data.is_blocked) throw new Error('Forbidden');
  return user;
}

export async function setWishDisabled(id: string, disabled: boolean) {
  await assertAdmin();
  const { error } = await createAdminClient().from('wishes').update({ is_disabled: disabled }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function deleteWish(id: string) {
  await assertAdmin();
  const { error } = await createAdminClient().from('wishes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  const me = await assertAdmin();
  if (me.id === userId) throw new Error("You can't block yourself");
  const { error } = await createAdminClient().from('profiles').update({ is_blocked: blocked }).eq('id', userId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}
