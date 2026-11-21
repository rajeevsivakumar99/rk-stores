-- RK Stores: Migration 002 — Cart, Order, Coupon, Banner, Activity Log, OTP attempts (the otp_attempts table is optional / currently unused)
-- Run this in Supabase SQL Editor AFTER supabase/schema.sql has been applied.
-- Every statement is idempotent (IF NOT EXISTS / DO blocks) so it is safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Carts (one per authenticated customer)
-- ---------------------------------------------------------------------------
create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

create index if not exists carts_user_id_idx on carts (user_id);

-- ---------------------------------------------------------------------------
-- 2. Cart items
-- ---------------------------------------------------------------------------
create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (cart_id, product_id)
);

create index if not exists cart_items_cart_id_idx on cart_items (cart_id);
create index if not exists cart_items_product_id_idx on cart_items (product_id);

-- ---------------------------------------------------------------------------
-- 3a. Coupons / discounts (must exist before orders, which reference them)
-- ---------------------------------------------------------------------------
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null default 'percent' check (discount_type in ('percent','amount')),
  discount_value numeric(10,2) not null check (discount_value >= 0),
  min_order numeric(10,2) check (min_order >= 0),
  max_uses int check (max_uses >= 0),
  used_count int not null default 0 check (used_count >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists coupons_code_idx on coupons (code);
create index if not exists coupons_active_idx on coupons (active);



-- ---------------------------------------------------------------------------
-- 3. Orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  coupon_id uuid references coupons(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','ready','completed','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  total numeric(10,2) not null default 0 check (total >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_at_idx on orders (created_at);

-- ---------------------------------------------------------------------------
-- 4. Order items (price snapshot at time of order)
-- ---------------------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  product_code text,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  total_price numeric(10,2) not null check (total_price >= 0),
  created_at timestamptz default now()
);

create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists order_items_product_id_idx on order_items (product_id);

-- ---------------------------------------------------------------------------
-- 6. Banners (homepage / promotional)
-- ---------------------------------------------------------------------------
create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  position text not null default 'home' check (position in ('home','category','top')),
  sort_order int not null default 0,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists banners_position_idx on banners (position);
create index if not exists banners_active_idx on banners (active);

-- ---------------------------------------------------------------------------
-- 7. Admin activity logs (server-insert only; admins can read)
-- ---------------------------------------------------------------------------
create table if not exists admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id) on delete set null,
  action text not null,
  table_name text,
  record_id text,
  details jsonb,
  created_at timestamptz default now()
);

create index if not exists admin_activity_logs_admin_id_idx on admin_activity_logs (admin_id);
create index if not exists admin_activity_logs_created_at_idx on admin_activity_logs (created_at);

-- ---------------------------------------------------------------------------
-- 8. OTP attempt tracking (rate limiting for phone/email OTP)
-- ---------------------------------------------------------------------------
create table if not exists otp_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  attempts int not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (identifier)
);

create index if not exists otp_attempts_identifier_idx on otp_attempts (identifier);


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table coupons enable row level security;
alter table banners enable row level security;
alter table admin_activity_logs enable row level security;
alter table otp_attempts enable row level security;

-- Carts: owner only
do $$
begin
  if not exists (select 1 from pg_policies where tablename='carts' and policyname='own cart') then
    create policy "own cart" on carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='cart_items' and policyname='own cart items') then
    create policy "own cart items" on cart_items for all
      using (exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()))
      with check (exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()));
  end if;
end $$;

-- Orders: customers read own; admins read all; service role inserts via server actions
do $$
begin
  if not exists (select 1 from pg_policies where tablename='orders' and policyname='own orders read') then
    create policy "own orders read" on orders for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='orders' and policyname='admin orders all') then
    create policy "admin orders all" on orders for all using (is_admin()) with check (is_admin());
  end if;
end $$;

-- Order items: customers read via own order; admins read all
do $$
begin
  if not exists (select 1 from pg_policies where tablename='order_items' and policyname='own order items read') then
    create policy "own order items read" on order_items for select
      using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename='order_items' and policyname='admin order items all') then
    create policy "admin order items all" on order_items for all using (is_admin()) with check (is_admin());
  end if;
end $$;

-- Coupons: public read active; admin full control
do $$
begin
  if not exists (select 1 from pg_policies where tablename='coupons' and policyname='read active coupons') then
    create policy "read active coupons" on coupons for select using (active = true);
  end if;
  if not exists (select 1 from pg_policies where tablename='coupons' and policyname='admin coupons all') then
    create policy "admin coupons all" on coupons for all using (is_admin()) with check (is_admin());
  end if;
end $$;

-- Banners: public read active; admin full control
do $$
begin
  if not exists (select 1 from pg_policies where tablename='banners' and policyname='read active banners') then
    create policy "read active banners" on banners for select using (active = true);
  end if;
  if not exists (select 1 from pg_policies where tablename='banners' and policyname='admin banners all') then
    create policy "admin banners all" on banners for all using (is_admin()) with check (is_admin());
  end if;
end $$;

-- Admin activity logs: admins read; service-role inserts only (no customer policy)
do $$
begin
  if not exists (select 1 from pg_policies where tablename='admin_activity_logs' and policyname='admin activity logs read') then
    create policy "admin activity logs read" on admin_activity_logs for select using (is_admin());
  end if;
end $$;

-- OTP attempts: no public/customer policy (server-only via service role). Admins can read for debugging.
do $$
begin
  if not exists (select 1 from pg_policies where tablename='otp_attempts' and policyname='admin otp attempts read') then
    create policy "admin otp attempts read" on otp_attempts for select using (is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Helper: log admin activity (called from server actions after admin verification)
-- ---------------------------------------------------------------------------
create or replace function log_admin_activity(
  p_action text,
  p_table_name text default null,
  p_record_id text default null,
  p_details jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into admin_activity_logs (admin_id, action, table_name, record_id, details, created_at)
  values (auth.uid(), p_action, p_table_name, p_record_id, p_details, now());
end $$;

-- Migration complete. Run this file in Supabase SQL Editor after schema.sql.
