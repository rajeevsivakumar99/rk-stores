-- RK Stores: Migration 003 - Daily sales (GPay + Cash), sales reminders, customer feedback with screenshots.
-- Safe to run more than once. Run it in Supabase -> SQL Editor (after schema.sql and migration 002).

-- ---------------------------------------------------------------------------
-- 1. Daily sales: one row per day, GPay + Cash. Total is calculated by the database.
-- ---------------------------------------------------------------------------
create table if not exists daily_sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null unique,
  gpay_amount numeric(12,2) not null check (gpay_amount >= 0),
  cash_amount numeric(12,2) not null check (cash_amount >= 0),
  total_amount numeric(13,2) generated always as (gpay_amount + cash_amount) stored,
  note text,
  entered_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists daily_sales_date_idx on daily_sales (sale_date desc);

alter table daily_sales enable row level security;
drop policy if exists "admin daily sales" on daily_sales;
create policy "admin daily sales" on daily_sales for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- 2. Notification types for the new admin reminders / feedback alerts
-- ---------------------------------------------------------------------------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('closing_reminder','holiday','offer','custom','sales_reminder','feedback'));

-- ---------------------------------------------------------------------------
-- 3. Feedback (title, description, optional screenshot)
-- ---------------------------------------------------------------------------
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  screenshot_path text,
  status text not null default 'new' check (status in ('new','reviewed','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_idx on feedback (status, created_at desc);
create index if not exists feedback_user_idx on feedback (user_id, created_at desc);

alter table feedback enable row level security;
drop policy if exists "own feedback insert" on feedback;
drop policy if exists "own feedback read" on feedback;
drop policy if exists "admin feedback update" on feedback;
drop policy if exists "admin feedback delete" on feedback;
create policy "own feedback insert" on feedback for insert to authenticated with check (user_id = auth.uid());
create policy "own feedback read"   on feedback for select to authenticated using (user_id = auth.uid() or is_admin());
create policy "admin feedback update" on feedback for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin feedback delete" on feedback for delete to authenticated using (is_admin());

-- Private bucket for screenshots: PNG / JPEG / WebP, max 3 MB. Customers upload only into their own folder (<user id>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 3145728, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "feedback upload own" on storage.objects;
drop policy if exists "feedback read own or admin" on storage.objects;
drop policy if exists "feedback delete own or admin" on storage.objects;
create policy "feedback upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "feedback read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy "feedback delete own or admin" on storage.objects for delete to authenticated
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
