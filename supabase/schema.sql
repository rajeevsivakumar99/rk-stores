-- RK Stores: Supabase schema (run in Supabase SQL Editor)
create extension if not exists "pgcrypto";

-- Profiles (linked to auth.users) with role
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'customer' check (role in ('customer','admin','super_admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin'));
$$;

-- Auto-create profile on signup
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  insert into notification_preferences (user_id) values (new.id);
  return new;
end $$;

-- Store settings (single row, id = 1)
create table store_settings (
  id int primary key default 1 check (id = 1),
  store_name text default 'RK Stores',
  logo_url text,
  description text,
  whatsapp_number text,
  contact_number text,
  address text,
  maps_link text,
  email text,
  low_stock_threshold int not null default 5,
  show_quantity boolean not null default true,
  closing_notifications_enabled boolean not null default true,
  advance_notice_minutes int not null default 60,
  timezone text not null default 'Asia/Kolkata',
  updated_at timestamptz default now()
);
insert into store_settings (id) values (1);

-- Shop timings per weekday (0 = Sunday)
create table shop_timings (
  weekday int primary key check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_weekly_holiday boolean not null default false
);
insert into shop_timings (weekday, opens_at, closes_at)
select d, '09:00', '21:00' from generate_series(0,6) d;

-- Categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  image_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);
insert into categories (name, slug, sort_order) values
 ('Stationery','stationery',1),('Gift Collection','gift-collection',2),('Toys','toys',3),
 ('Home Essentials','home-essentials',4),('Plastics Collection','plastics-collection',5),
 ('Festival Collection','festival-collection',6),('Fancy Coverings','fancy-coverings',7);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  product_code text unique default ('RK-' || upper(substr(gen_random_uuid()::text,1,8))),
  name text not null,
  category_id uuid not null references categories(id),
  description text,
  image_url text,
  price numeric(10,2) not null check (price >= 0),
  quantity int not null default 0 check (quantity >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on products (category_id);
create index on products using gin (to_tsvector('simple', name));

-- Stock status is computed from the admin-configurable threshold
create view products_view with (security_invoker = true) as
select p.*, c.name as category_name, c.slug as category_slug,
  case when p.quantity = 0 then 'out_of_stock'
       when p.quantity <= s.low_stock_threshold then 'low_stock'
       else 'available' end as stock_status
from products p
join categories c on c.id = p.category_id
cross join store_settings s;

-- Price & stock history
create table price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  old_price numeric(10,2), new_price numeric(10,2),
  changed_by uuid references profiles(id), changed_at timestamptz default now()
);
create table stock_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  old_quantity int, new_quantity int,
  changed_by uuid references profiles(id), changed_at timestamptz default now()
);

create function log_product_changes() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  if new.price is distinct from old.price then
    insert into price_history (product_id, old_price, new_price, changed_by) values (new.id, old.price, new.price, auth.uid());
  end if;
  if new.quantity is distinct from old.quantity then
    insert into stock_history (product_id, old_quantity, new_quantity, changed_by) values (new.id, old.quantity, new.quantity, auth.uid());
  end if;
  return new;
end $$;
create trigger trg_product_changes before update on products for each row execute function log_product_changes();

-- Offers
create table offers (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, image_url text,
  discount_percent numeric(5,2), discount_amount numeric(10,2),
  starts_at timestamptz not null, ends_at timestamptz not null,
  product_id uuid references products(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  created_at timestamptz default now(),
  check (ends_at > starts_at)
);
-- Active/expired computed automatically
create view offers_view with (security_invoker = true) as
select o.*, (now() between o.starts_at and o.ends_at) as is_active from offers o;

-- Holiday / closure announcements
create table holidays (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text,
  kind text not null default 'holiday' check (kind in ('holiday','unexpected_closure','temporary_closure','special_hours','festival')),
  start_date date not null, end_date date,
  special_opens_at time, special_closes_at time,
  image_url text, created_at timestamptz default now()
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null, message text not null, image_url text,
  type text not null default 'custom' check (type in ('closing_reminder','holiday','offer','custom')),
  channels text[] not null default '{in_app}',   -- in_app | email | push
  dedupe_key text unique,                         -- prevents duplicate sends (e.g. 'closing:2026-11-12')
  offer_id uuid references offers(id) on delete set null,
  holiday_id uuid references holidays(id) on delete set null,
  scheduled_for timestamptz, sent_at timestamptz,
  created_by uuid references profiles(id), created_at timestamptz default now()
);

-- Per-user delivery record (also serves as in-app inbox + read state)
create table notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references notifications(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  channel text not null check (channel in ('in_app','email','push')),
  status text not null default 'pending' check (status in ('pending','sent','delivered','failed')),
  error text, read_at timestamptz, sent_at timestamptz,
  unique (notification_id, user_id, channel)
);
create index on notification_deliveries (user_id, read_at);

create table notification_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  in_app boolean default true, email boolean default true, push boolean default false
);
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null,
  created_at timestamptz default now()
);

-- Attach signup trigger (after notification_preferences exists)
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Row Level Security
alter table profiles enable row level security;
alter table store_settings enable row level security;
alter table shop_timings enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table price_history enable row level security;
alter table stock_history enable row level security;
alter table offers enable row level security;
alter table holidays enable row level security;
alter table notifications enable row level security;
alter table notification_deliveries enable row level security;
alter table notification_preferences enable row level security;
alter table push_subscriptions enable row level security;

-- Public read: catalogue + store info (visitors can browse; an account is needed for notifications and profile)
create policy "read settings" on store_settings for select to anon, authenticated using (true);
create policy "read timings" on shop_timings for select to anon, authenticated using (true);
create policy "read categories" on categories for select to anon, authenticated using (true);
create policy "read products" on products for select to anon, authenticated using (true);
create policy "read offers" on offers for select to anon, authenticated using (true);
create policy "read holidays" on holidays for select to anon, authenticated using (true);
create policy "read notifications" on notifications for select to anon, authenticated using (true);

-- Admin full control
create policy "admin settings" on store_settings for all using (is_admin()) with check (is_admin());
create policy "admin timings" on shop_timings for all using (is_admin()) with check (is_admin());
create policy "admin categories" on categories for all using (is_admin()) with check (is_admin());
create policy "admin products" on products for all using (is_admin()) with check (is_admin());
create policy "admin offers" on offers for all using (is_admin()) with check (is_admin());
create policy "admin holidays" on holidays for all using (is_admin()) with check (is_admin());
create policy "admin notifications" on notifications for all using (is_admin()) with check (is_admin());
create policy "admin price history" on price_history for select using (is_admin());
create policy "admin stock history" on stock_history for select using (is_admin());
create policy "admin deliveries" on notification_deliveries for select using (is_admin());
create policy "admin profiles" on profiles for select using (is_admin());

-- Customers: own data only
create policy "own profile read" on profiles for select using (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid())); -- cannot self-promote
create policy "own deliveries read" on notification_deliveries for select using (user_id = auth.uid());
create policy "own deliveries mark read" on notification_deliveries for update using (user_id = auth.uid());
create policy "own prefs" on notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push subs" on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage buckets (public read, admin write)
insert into storage.buckets (id, name, public) values ('product-images','product-images',true),('store-assets','store-assets',true)
  on conflict do nothing;
create policy "public read images" on storage.objects for select using (bucket_id in ('product-images','store-assets'));
create policy "admin write images" on storage.objects for all
  using (bucket_id in ('product-images','store-assets') and is_admin())
  with check (bucket_id in ('product-images','store-assets') and is_admin());

-- Make yourself admin after first signup:
-- update profiles set role = 'super_admin' where id = '<your-auth-user-uuid>';

-- Live unread-count updates in the customer header
alter publication supabase_realtime add table notification_deliveries;
