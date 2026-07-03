import { supabase } from './supabase';
import { Shop, OnlineProduct } from './types';

export function isShopOpen(shop: Shop): boolean {
  if (shop.manual_override === 'open') return true;
  if (shop.manual_override === 'closed') return false;
  const now = new Date();
  const day = now.getDay();
  const slot = shop.schedule.find(s => s.day === day);
  if (!slot) return false;
  const [oh, om] = slot.open.split(':').map(Number);
  const [ch, cm] = slot.close.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

export async function fetchShop(slug: string): Promise<Shop | null> {
  const { data } = await supabase
    .from('online_shops')
    .select('*')
    .eq('shop_slug', slug)
    .single();
  return data ?? null;
}

export async function fetchProducts(shopId: string): Promise<OnlineProduct[]> {
  const { data } = await supabase
    .from('online_products')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_visible', true);
  return (data ?? []) as OnlineProduct[];
}
