/**
 * Supabase CRUD for the `customer_addresses` table.
 * All calls are scoped to the signed-in user via RLS (user_id = auth.uid()).
 */
import { supabase } from './supabase';
import { CustomerAddress } from './types';

export type AddressInput = Partial<
  Omit<CustomerAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>
> & {
  formatted_address: string;
};

/** List the current user's addresses (default first, then newest). */
export async function listAddresses(): Promise<CustomerAddress[]> {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error('listAddresses', error); return []; }
  return (data ?? []) as CustomerAddress[];
}

/**
 * Like listAddresses but distinguishes a load error from a genuinely empty list,
 * so the UI can show a retry state instead of "no addresses yet" on failure.
 */
export async function fetchAddresses(): Promise<{ data: CustomerAddress[]; error: boolean }> {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchAddresses', error); return { data: [], error: true }; }
  return { data: (data ?? []) as CustomerAddress[], error: false };
}

/** Create a new address. If the user has none yet, it's made default. */
export async function createAddress(input: AddressInput): Promise<CustomerAddress | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  const existing = await listAddresses();
  const makeDefault = input.is_default ?? existing.length === 0;

  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({ ...input, user_id: uid, is_default: makeDefault })
    .select('*')
    .single();
  if (error) { console.error('createAddress', error); return null; }
  return data as CustomerAddress;
}

/** Update an existing address. */
export async function updateAddress(
  id: string,
  patch: AddressInput,
): Promise<CustomerAddress | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  // RLS already scopes this to the caller's own rows — the explicit
  // user_id filter is defense-in-depth, not the only thing stopping a
  // cross-user edit (see the shop-closed/order-price audit: relying on a
  // single layer is exactly the pattern that's bitten this schema before,
  // e.g. the anon_all_orders incident noted in section 7/9 above).
  const { data, error } = await supabase
    .from('customer_addresses')
    .update(patch)
    .eq('id', id)
    .eq('user_id', uid)
    .select('*')
    .single();
  if (error) { console.error('updateAddress', error); return null; }
  return data as CustomerAddress;
}

/** Delete an address. If it was the default, promote the newest remaining one. */
export async function deleteAddress(id: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;

  const target = (await listAddresses()).find(a => a.id === id);
  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', uid);
  if (error) { console.error('deleteAddress', error); return false; }

  if (target?.is_default) {
    const remaining = await listAddresses();
    if (remaining.length > 0) await setDefaultAddress(remaining[0].id);
  }
  return true;
}

/** Mark an address as the default (DB trigger clears the previous one). */
export async function setDefaultAddress(id: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;

  const { error } = await supabase
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', uid);
  if (error) { console.error('setDefaultAddress', error); return false; }
  return true;
}
