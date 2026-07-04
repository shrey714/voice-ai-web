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


-- ────────────────────────────────────────────────────────────
-- 7. SECURITY FIX — enable RLS on online_orders
--
--    Policies for this table ("customers read own orders",
--    "customers insert orders", section 3 above) already existed,
--    but RLS was never turned ON for the table — an unenabled RLS
--    policy does nothing; the table stayed fully open by default.
--    Verified live: anon key could SELECT * on every order
--    (customer names, phone numbers, items) with no auth at all.
--
--    KNOWN SIDE EFFECT: the shopkeeper mobile app reads/updates
--    this table via the same anon key with no Supabase Auth
--    session — it has no identity for RLS to check against, so
--    its order dashboard (fetchOrders / updateOrderStatus) will
--    lose access until the mobile app gets real authentication.
--    Accepted tradeoff — closing the live PII leak takes priority.
-- ────────────────────────────────────────────────────────────
alter table public.online_orders enable row level security;


-- ────────────────────────────────────────────────────────────
-- 8. Defense-in-depth data validation — DB-level CHECK constraints
--
--    There's no API layer in front of Supabase here (the client talks
--    to PostgREST directly), so the checkout form's client-side
--    validation is the ONLY gate today. RLS stops unauthorized access,
--    but nothing stops an authorized customer's client from sending
--    malformed data (negative totals, empty item lists) directly to
--    PostgREST, bypassing the UI entirely. These constraints move that
--    validation to where it can't be bypassed.
--
--    Verified against live data before writing this: 0 of 2 existing
--    orders violate any of these — safe to apply as-is.
-- ────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'online_orders_subtotal_nonneg') then
    alter table public.online_orders add constraint online_orders_subtotal_nonneg check (subtotal >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'online_orders_delivery_fee_nonneg') then
    alter table public.online_orders add constraint online_orders_delivery_fee_nonneg check (delivery_fee >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'online_orders_total_nonneg') then
    alter table public.online_orders add constraint online_orders_total_nonneg check (total >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'online_orders_items_nonempty') then
    -- Cast to jsonb explicitly so this works whether the column is json or jsonb.
    alter table public.online_orders add constraint online_orders_items_nonempty check (jsonb_array_length(items::jsonb) > 0);
  end if;
end $$;


-- ────────────────────────────────────────────────────────────
-- 9. SECURITY FIX (actual root cause) — drop the blanket-allow policy
--
--    Section 7 enabled RLS on online_orders, but verified live that
--    customer PII (names, phone numbers) was STILL fully readable by
--    anon afterward. Root cause: a pre-existing policy
--    "anon_all_orders" (cmd ALL, roles public, qual true, with_check
--    true) grants unconditional access regardless of RLS being on —
--    it predates these migrations and isn't defined anywhere in this
--    file. It's almost certainly what lets the shopkeeper mobile app
--    (no real auth of its own) read/update its shop's orders today.
--
--    Dropping it closes the leak for real, and — same accepted
--    tradeoff as section 7 — breaks the shopkeeper app's order
--    dashboard until it gets real authentication (mobile, tracked
--    separately, out of scope here).
-- ────────────────────────────────────────────────────────────
drop policy if exists "anon_all_orders" on public.online_orders;


-- ────────────────────────────────────────────────────────────
-- 10. Real shop-owner identity — foundation for shopkeeper auth
--
--    Same discovery as section 9 also applies to online_shops
--    ("anon_all_shops") and online_products ("anon_all_products") —
--    both grant unconditional read/write to anyone with the anon key,
--    not just the shop that owns the data. NOT dropped here — doing
--    so today would break shop settings + product sync in the
--    shopkeeper app (bigger break than what was asked for). This
--    section only adds the real, scoped alternative so the mobile
--    app has something correct to switch to.
--
--    Once the shopkeeper app signs in via Supabase Auth (same OTP
--    mechanism the customer side already uses) and every shop has
--    owner_user_id set, drop the three "anon_all_*" policies —
--    the owner-scoped policies below fully replace what they did,
--    minus the "anyone can touch anyone's shop" part.
-- ────────────────────────────────────────────────────────────
alter table public.online_shops
  add column if not exists owner_user_id uuid references auth.users(id);

-- Shop owner can see their own shop even while unpublished (is_enabled = false).
drop policy if exists "owner read own shop" on public.online_shops;
create policy "owner read own shop"
  on public.online_shops for select
  using (owner_user_id = auth.uid());

-- First-time setup: a signed-in shopkeeper can create exactly one shop
-- row for themselves (owner_user_id must match their own auth.uid()).
drop policy if exists "owner insert own shop" on public.online_shops;
create policy "owner insert own shop"
  on public.online_shops for insert
  with check (owner_user_id = auth.uid());

-- Shop owner can update their own shop's settings.
drop policy if exists "owner update own shop" on public.online_shops;
create policy "owner update own shop"
  on public.online_shops for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Public product browsing needs its own real policy once anon_all_products
-- is eventually dropped — mirrors "public read enabled shops".
drop policy if exists "public read visible products" on public.online_products;
create policy "public read visible products"
  on public.online_products for select
  using (is_visible = true);

-- Shop owner can manage (insert/update/delete) products for shops they own.
drop policy if exists "owner manage own products" on public.online_products;
create policy "owner manage own products"
  on public.online_products for all
  using (shop_id in (select id from public.online_shops where owner_user_id = auth.uid()))
  with check (shop_id in (select id from public.online_shops where owner_user_id = auth.uid()));

-- Shop owner can view and update the status of orders placed at their shop
-- (accept / reject / mark ready / complete) — this is what actually
-- restores order management once the app signs in for real.
drop policy if exists "owner read own shop orders" on public.online_orders;
create policy "owner read own shop orders"
  on public.online_orders for select
  using (shop_id in (select id from public.online_shops where owner_user_id = auth.uid()));

drop policy if exists "owner update own shop orders" on public.online_orders;
create policy "owner update own shop orders"
  on public.online_orders for update
  using (shop_id in (select id from public.online_shops where owner_user_id = auth.uid()))
  with check (shop_id in (select id from public.online_shops where owner_user_id = auth.uid()));


-- ────────────────────────────────────────────────────────────
-- 11. Close the remaining holes — shopkeeper mobile auth is now live
--     and verified working (order accept/reject/status update tested
--     from both mobile and web). Safe to finish the cutover started
--     in section 10.
--
--     Also found while testing: the "online-shop-images" storage
--     bucket (the one actually used by the app — a separate,
--     unrelated bucket "product-images" already had correct
--     per-user-scoped policies) allowed unconditional anon INSERT/
--     UPDATE, no ownership check at all. Replacing with the same
--     shop-ownership scoping used everywhere else. Path shape is
--     shops/{shopId}/{productId}.jpg, so folder segment 2 is the
--     shop id.
-- ────────────────────────────────────────────────────────────
drop policy if exists "anon_all_shops" on public.online_shops;
drop policy if exists "anon_all_products" on public.online_products;

drop policy if exists "anon upload online shop images" on storage.objects;
drop policy if exists "anon update online shop images" on storage.objects;

create policy "owner upload own shop images"
  on storage.objects for insert
  with check (
    bucket_id = 'online-shop-images'
    and (storage.foldername(name))[1] = 'shops'
    and (storage.foldername(name))[2] in (
      select id::text from public.online_shops where owner_user_id = auth.uid()
    )
  );

create policy "owner update own shop images"
  on storage.objects for update
  using (
    bucket_id = 'online-shop-images'
    and (storage.foldername(name))[1] = 'shops'
    and (storage.foldername(name))[2] in (
      select id::text from public.online_shops where owner_user_id = auth.uid()
    )
  );
