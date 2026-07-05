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


-- ────────────────────────────────────────────────────────────
-- 12. Block orders against a closed/disabled shop at the database layer
--
--     Found: the web app's checkout only checked shop hours client-side,
--     and only at page-load time. A cart added while a shop was open
--     survives (by design — it's keyed per-shop in localStorage with no
--     expiry) past closing time, past days, indefinitely. Nothing
--     re-validated shop status before the order insert, and since that
--     insert is a direct client-side Supabase call, a client-side-only
--     fix is trivially bypassable (e.g. calling supabase.insert directly
--     from devtools) — this needs to be enforced here, not just in the UI.
--
--     Mirrors src/lib/shop.ts's isShopOpen(): disabled shops are never
--     open; manual_override short-circuits the schedule; otherwise the
--     shop's schedule is checked for the current day/time. Schedule times
--     are shop-local wall-clock (this app is India-only, see the Photon
--     search bias in src/lib/geocode.ts), so this evaluates "now" in
--     Asia/Kolkata rather than the database session's timezone.
--
--     If online_shops.schedule isn't a jsonb array of
--     {day:int, open:"HH:MM", close:"HH:MM"} on your instance, adjust the
--     jsonb_array_elements() block below to match.
-- ────────────────────────────────────────────────────────────
create or replace function public.is_shop_open(p_shop_id uuid)
returns boolean
language plpgsql
stable
as $$
declare
  v_enabled boolean;
  v_override text;
  v_schedule jsonb;
  v_slot jsonb;
  v_now timestamp := now() at time zone 'Asia/Kolkata';
  v_mins int;
  v_open_mins int;
  v_close_mins int;
begin
  select is_enabled, manual_override, schedule
    into v_enabled, v_override, v_schedule
    from public.online_shops
    where id = p_shop_id;

  if not found or v_enabled is not true then
    return false;
  end if;

  if v_override = 'open' then return true; end if;
  if v_override = 'closed' then return false; end if;

  select s into v_slot
    from jsonb_array_elements(coalesce(v_schedule, '[]'::jsonb)) s
    where (s->>'day')::int = extract(dow from v_now)::int
    limit 1;

  if v_slot is null then return false; end if;

  v_mins := extract(hour from v_now)::int * 60 + extract(minute from v_now)::int;
  v_open_mins := split_part(v_slot->>'open', ':', 1)::int * 60 + split_part(v_slot->>'open', ':', 2)::int;
  v_close_mins := split_part(v_slot->>'close', ':', 1)::int * 60 + split_part(v_slot->>'close', ':', 2)::int;

  return v_mins >= v_open_mins and v_mins < v_close_mins;
end;
$$;

drop policy if exists "customers insert orders" on online_orders;
create policy "customers insert orders"
  on online_orders for insert
  with check (
    customer_user_id = auth.uid()
    and public.is_shop_open(shop_id)
  );


-- ────────────────────────────────────────────────────────────
-- 13. Price/stock integrity at order insert
--
--    Found during a wider audit after the shop-closed fix above: the
--    checkout page (src/app/[slug]/checkout/page.tsx) builds `items`,
--    `subtotal`, `delivery_fee` and `total` entirely from client/
--    localStorage cart state and inserts them verbatim — same trust-
--    boundary bug as the shop-closed issue, just for money and stock
--    instead of open/closed. Nothing previously re-validated that:
--      - a line's unitPrice matches the product's current price
--      - the requested quantity doesn't exceed current stock
--      - the product still exists / is still visible / belongs to this shop
--      - delivery_fee matches the shop's current fee
--      - subtotal meets the shop's current min_order_amount
--    Since the order insert is a direct client-side Supabase call (no
--    API layer in front of PostgREST — see section 7/9's postmortem),
--    a client-side-only fix is bypassable from devtools. This trigger
--    recomputes everything from the live catalog and rejects the
--    insert if it doesn't add up, the same way `is_shop_open` above
--    closes the open/closed gap at the database layer.
--
--    Coupons (LOCAL10/FRESH15 in checkout/page.tsx) are a client-side-
--    only demo feature with no server-side ledger of which code was
--    applied, so there's nothing structured to validate a specific
--    code against. Rather than trust the client's discount arithmetic
--    outright, `total` is allowed to sit anywhere between the full
--    recomputed price and that price minus the richest coupon's
--    maximum benefit (15% capped at ₹80) — closes the "set total to
--    ₹1" exploit while the discount feature stays functional. If
--    coupons become a real, server-tracked feature, replace this cap
--    with an exact match against the applied code's discount.
-- ────────────────────────────────────────────────────────────
create or replace function public.validate_order_before_insert()
returns trigger
language plpgsql
as $$
declare
  v_item jsonb;
  v_product record;
  v_recomputed_items jsonb := '[]'::jsonb;
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_shop record;
  v_delivery_fee numeric(12,2) := 0;
  v_max_discount numeric(12,2);
  v_min_total numeric(12,2);
  v_max_total numeric(12,2);
begin
  if jsonb_array_length(NEW.items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  for v_item in select * from jsonb_array_elements(NEW.items)
  loop
    select product_id, name, online_price, store_price, quantity, is_visible
      into v_product
      from public.online_products
      where product_id = (v_item->>'productId') and shop_id = NEW.shop_id;

    if not found or v_product.is_visible is not true then
      raise exception 'One or more items in your cart are no longer available. Please refresh your cart and try again.';
    end if;

    if (v_item->>'quantity')::int > v_product.quantity then
      raise exception 'Only % left of "%" — please update the quantity in your cart.', v_product.quantity, v_product.name;
    end if;

    v_line_total := coalesce(v_product.online_price, v_product.store_price, 0) * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_line_total;

    v_recomputed_items := v_recomputed_items || jsonb_build_object(
      'productId', v_product.product_id,
      'productName', v_product.name,
      'quantity', (v_item->>'quantity')::int,
      'unitPrice', coalesce(v_product.online_price, v_product.store_price, 0),
      'totalPrice', v_line_total
    );
  end loop;

  select min_order_amount, delivery_fee, delivery_enabled
    into v_shop
    from public.online_shops
    where id = NEW.shop_id;

  if v_subtotal < v_shop.min_order_amount then
    raise exception 'Minimum order is ₹%.', v_shop.min_order_amount;
  end if;

  if NEW.customer_address is not null and v_shop.delivery_enabled then
    v_delivery_fee := v_shop.delivery_fee;
  end if;

  v_max_total := v_subtotal + v_delivery_fee;
  v_max_discount := least(v_subtotal * 0.15, 80);
  v_min_total := greatest(v_max_total - v_max_discount, 0);

  if NEW.total < v_min_total then
    raise exception 'Order total doesn''t match current pricing. Please refresh and try again.';
  end if;
  -- Client's total can be *higher* than v_max_total for an honest reason —
  -- a price or delivery fee dropped since the cart was filled — so that
  -- direction is corrected in the customer's favor rather than rejected;
  -- only undercharging (the fraud direction) blocks the insert above.
  if NEW.total > v_max_total then
    NEW.total := v_max_total;
  end if;

  NEW.items := v_recomputed_items;
  NEW.subtotal := v_subtotal;
  NEW.delivery_fee := v_delivery_fee;

  return NEW;
end;
$$;

drop trigger if exists validate_order_before_insert on public.online_orders;
create trigger validate_order_before_insert
  before insert on public.online_orders
  for each row execute function public.validate_order_before_insert();


-- ────────────────────────────────────────────────────────────
-- 14. Auto-cancel pending orders the shopkeeper never responded to
--
--    `expires_at` is set at insert time (checkout page) to
--    now() + that SHOP'S OWN order_timeout_minutes — so this job
--    doesn't need to know per-shop settings at all, it just cancels
--    whatever's already past its own deadline, whatever that shop's
--    timeout happened to be when the order was placed. Runs every
--    minute via pg_cron; the `status = 'pending'` guard makes it a
--    no-op for any order the shopkeeper already accepted/rejected.
-- ────────────────────────────────────────────────────────────
create extension if not exists pg_cron with schema extensions;

create or replace function public.cancel_expired_pending_orders()
returns void
language sql
security definer
set search_path = public
as $$
  update public.online_orders
  set status = 'cancelled', updated_at = now()
  where status = 'pending' and expires_at <= now();
$$;

-- Re-running this file shouldn't create a duplicate schedule.
select cron.unschedule('cancel-expired-pending-orders')
  where exists (select 1 from cron.job where jobname = 'cancel-expired-pending-orders');

select cron.schedule(
  'cancel-expired-pending-orders',
  '* * * * *', -- every minute
  $$ select public.cancel_expired_pending_orders(); $$
);


-- ────────────────────────────────────────────────────────────
-- 15. Guardrails on order_timeout_minutes — the auto-cancel deadline
--
--    Bounded to a sane 5-30 minute range with a real default (10),
--    so this can't be misconfigured to "cancel almost instantly" or
--    left blank meaning "never cancel". Existing null/out-of-range
--    rows are clamped into range before NOT NULL/CHECK are enforced,
--    so this is safe to run against live data.
-- ────────────────────────────────────────────────────────────
update public.online_shops
  set order_timeout_minutes = 10
  where order_timeout_minutes is null;

update public.online_shops
  set order_timeout_minutes = least(greatest(order_timeout_minutes, 5), 30)
  where order_timeout_minutes < 5 or order_timeout_minutes > 30;

alter table public.online_shops
  alter column order_timeout_minutes set default 10,
  alter column order_timeout_minutes set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'online_shops_order_timeout_range') then
    alter table public.online_shops
      add constraint online_shops_order_timeout_range check (order_timeout_minutes between 5 and 30);
  end if;
end $$;
