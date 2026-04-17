create extension if not exists "pgcrypto";

create table if not exists public.transaksi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipe text not null check (tipe in ('masuk', 'keluar')),
  jumlah integer not null check (jumlah > 0),
  ket text not null,
  kat text not null default 'Lainnya',
  tgl date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.split_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  judul text not null,
  tgl date not null default current_date,
  pajak integer not null default 0,
  ongkir integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.split_bill_menus (
  id uuid primary key default gen_random_uuid(),
  split_bill_id uuid not null references public.split_bills(id) on delete cascade,
  nama_menu text not null,
  harga_satuan integer not null check (harga_satuan >= 0),
  qty integer not null default 1 check (qty > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.split_bill_pesanan (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.split_bill_menus(id) on delete cascade,
  nama_orang text not null,
  created_at timestamptz not null default now()
);

alter table public.transaksi enable row level security;
alter table public.split_bills enable row level security;
alter table public.split_bill_menus enable row level security;
alter table public.split_bill_pesanan enable row level security;

-- =========================
-- HAPUS POLICY LAMA KALAU ADA
-- =========================

drop policy if exists "transaksi_select_own" on public.transaksi;
drop policy if exists "transaksi_insert_own" on public.transaksi;
drop policy if exists "transaksi_update_own" on public.transaksi;
drop policy if exists "transaksi_delete_own" on public.transaksi;

drop policy if exists "split_bills_select_own" on public.split_bills;
drop policy if exists "split_bills_insert_own" on public.split_bills;
drop policy if exists "split_bills_update_own" on public.split_bills;
drop policy if exists "split_bills_delete_own" on public.split_bills;

drop policy if exists "split_bill_menus_select_own" on public.split_bill_menus;
drop policy if exists "split_bill_menus_insert_own" on public.split_bill_menus;
drop policy if exists "split_bill_menus_update_own" on public.split_bill_menus;
drop policy if exists "split_bill_menus_delete_own" on public.split_bill_menus;

drop policy if exists "split_bill_pesanan_select_own" on public.split_bill_pesanan;
drop policy if exists "split_bill_pesanan_insert_own" on public.split_bill_pesanan;
drop policy if exists "split_bill_pesanan_update_own" on public.split_bill_pesanan;
drop policy if exists "split_bill_pesanan_delete_own" on public.split_bill_pesanan;

-- =========================
-- TRANSAKSI
-- =========================

create policy "transaksi_select_own"
on public.transaksi
for select
to authenticated
using (auth.uid() = user_id);

create policy "transaksi_insert_own"
on public.transaksi
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "transaksi_update_own"
on public.transaksi
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "transaksi_delete_own"
on public.transaksi
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================
-- SPLIT BILLS
-- =========================

create policy "split_bills_select_own"
on public.split_bills
for select
to authenticated
using (auth.uid() = user_id);

create policy "split_bills_insert_own"
on public.split_bills
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "split_bills_update_own"
on public.split_bills
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "split_bills_delete_own"
on public.split_bills
for delete
to authenticated
using (auth.uid() = user_id);

-- =========================
-- SPLIT BILL MENUS
-- =========================

create policy "split_bill_menus_select_own"
on public.split_bill_menus
for select
to authenticated
using (
  exists (
    select 1
    from public.split_bills sb
    where sb.id = split_bill_id
      and sb.user_id = auth.uid()
  )
);

create policy "split_bill_menus_insert_own"
on public.split_bill_menus
for insert
to authenticated
with check (
  exists (
    select 1
    from public.split_bills sb
    where sb.id = split_bill_id
      and sb.user_id = auth.uid()
  )
);

create policy "split_bill_menus_update_own"
on public.split_bill_menus
for update
to authenticated
using (
  exists (
    select 1
    from public.split_bills sb
    where sb.id = split_bill_id
      and sb.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.split_bills sb
    where sb.id = split_bill_id
      and sb.user_id = auth.uid()
  )
);

create policy "split_bill_menus_delete_own"
on public.split_bill_menus
for delete
to authenticated
using (
  exists (
    select 1
    from public.split_bills sb
    where sb.id = split_bill_id
      and sb.user_id = auth.uid()
  )
);

-- =========================
-- SPLIT BILL PESANAN
-- =========================

create policy "split_bill_pesanan_select_own"
on public.split_bill_pesanan
for select
to authenticated
using (
  exists (
    select 1
    from public.split_bill_menus m
    join public.split_bills sb on sb.id = m.split_bill_id
    where m.id = menu_id
      and sb.user_id = auth.uid()
  )
);

create policy "split_bill_pesanan_insert_own"
on public.split_bill_pesanan
for insert
to authenticated
with check (
  exists (
    select 1
    from public.split_bill_menus m
    join public.split_bills sb on sb.id = m.split_bill_id
    where m.id = menu_id
      and sb.user_id = auth.uid()
  )
);

create policy "split_bill_pesanan_update_own"
on public.split_bill_pesanan
for update
to authenticated
using (
  exists (
    select 1
    from public.split_bill_menus m
    join public.split_bills sb on sb.id = m.split_bill_id
    where m.id = menu_id
      and sb.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.split_bill_menus m
    join public.split_bills sb on sb.id = m.split_bill_id
    where m.id = menu_id
      and sb.user_id = auth.uid()
  )
);

create policy "split_bill_pesanan_delete_own"
on public.split_bill_pesanan
for delete
to authenticated
using (
  exists (
    select 1
    from public.split_bill_menus m
    join public.split_bills sb on sb.id = m.split_bill_id
    where m.id = menu_id
      and sb.user_id = auth.uid()
  )
);