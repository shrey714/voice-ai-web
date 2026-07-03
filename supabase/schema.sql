-- ============================================================
-- ShopNear — Consolidated Supabase schema migrations
-- Run this whole file in the Supabase SQL Editor.
--
-- Safe to re-run (idempotent) — every statement uses
-- `if not exists` / `on conflict do nothing` guards. Sections are
-- ordered chronologically as the features were built.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Online products — detail columns synced from the shopkeeper app
-- ────────────────────────────────────────────────────────────
alter table online_products
  add column if not exists name         text,
  add column if not exists category     text,
  add column if not exists store_price  numeric(12,2),
  add column if not exists quantity     int,
  add column if not exists unit         text,
  add column if not exists image_url    text;


-- ────────────────────────────────────────────────────────────
-- 2. Storage bucket for product images
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "anon upload product images" on storage.objects;
create policy "anon upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');


-- ────────────────────────────────────────────────────────────
-- 3. Customer auth — link orders to auth users + RLS
-- ────────────────────────────────────────────────────────────
alter table online_orders
  add column if not exists customer_user_id uuid references auth.users(id);

drop policy if exists "customers read own orders" on online_orders;
create policy "customers read own orders"
  on online_orders for select
  using (customer_user_id = auth.uid());

drop policy if exists "customers insert orders" on online_orders;
create policy "customers insert orders"
  on online_orders for insert
  with check (customer_user_id = auth.uid());

drop policy if exists "public read enabled shops" on online_shops;
create policy "public read enabled shops"
  on online_shops for select
  using (is_enabled = true);


-- ────────────────────────────────────────────────────────────
-- 4. Customer location management — saved addresses
--    (Blinkit / Swiggy-style delivery address book)
-- ────────────────────────────────────────────────────────────
create table if not exists public.customer_addresses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  -- Label / type shown as a chip (Home / Work / Other / Hotel …)
  label             text not null default 'Home',

  -- Receiver details (may differ from the account holder)
  receiver_name     text,
  receiver_phone    text,

  -- Structured address parts (all optional — filled from geocode or by hand)
  flat              text,   -- House / Flat / Block no.
  building          text,   -- Apartment / building / road (line 1)
  landmark          text,   -- Nearby landmark
  area              text,   -- Locality / sub-locality
  city              text,
  state             text,
  pincode           text,

  -- Full human-readable address (from reverse geocode or composed on save).
  -- This is what we snapshot into online_orders.customer_address.
  formatted_address text not null,

  -- Geo coordinates (from GPS or the picked map point)
  latitude          double precision,
  longitude         double precision,

  is_default        boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists customer_addresses_user_idx
  on public.customer_addresses (user_id);

-- Enforce at most ONE default address per user at the DB level.
create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses (user_id)
  where is_default;

-- updated_at auto-touch
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;
create trigger customer_addresses_set_updated_at
  before update on public.customer_addresses
  for each row execute function public.tg_set_updated_at();

-- Single-default guard — when a row is marked default, clear the default
-- flag on the user's other rows FIRST, so the partial unique index above
-- is never violated.
create or replace function public.tg_customer_addresses_single_default()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.customer_addresses
       set is_default = false
     where user_id = new.user_id
       and id <> new.id
       and is_default;
  end if;
  return new;
end;
$$;

drop trigger if exists customer_addresses_single_default on public.customer_addresses;
create trigger customer_addresses_single_default
  before insert or update of is_default on public.customer_addresses
  for each row when (new.is_default)
  execute function public.tg_customer_addresses_single_default();

-- Row Level Security
alter table public.customer_addresses enable row level security;

drop policy if exists "own addresses select" on public.customer_addresses;
create policy "own addresses select"
  on public.customer_addresses for select
  using (user_id = auth.uid());

drop policy if exists "own addresses insert" on public.customer_addresses;
create policy "own addresses insert"
  on public.customer_addresses for insert
  with check (user_id = auth.uid());

drop policy if exists "own addresses update" on public.customer_addresses;
create policy "own addresses update"
  on public.customer_addresses for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own addresses delete" on public.customer_addresses;
create policy "own addresses delete"
  on public.customer_addresses for delete
  using (user_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 5. Shop location — coordinates + written address for
--    "Pickup from shop" delivery mode
-- ────────────────────────────────────────────────────────────
alter table public.online_shops
  add column if not exists latitude    double precision,
  add column if not exists longitude   double precision,
  add column if not exists address_text text;


-- ────────────────────────────────────────────────────────────
-- 6. Delivery radius — per-shop distance limit for home delivery
--    (NULL = unlimited range, preserves behavior for existing shops)
-- ────────────────────────────────────────────────────────────
alter table public.online_shops
  add column if not exists delivery_radius_km double precision;
