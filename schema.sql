-- 🍉 Meyve Birleştirme — Supabase şeması
-- Supabase panelinde: SQL Editor → New query → bu dosyanın tamamını yapıştır → Run.

-- ============ SKORLAR ============
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  device      text not null,
  nickname    text not null,
  score       integer not null check (score >= 0),
  mode        text not null,            -- 'campaign' | 'endless' | 'duel'
  level       integer,
  created_at  timestamptz not null default now()
);
create index if not exists scores_score_idx   on public.scores (score desc);
create index if not exists scores_created_idx  on public.scores (created_at desc);
create index if not exists scores_mode_idx     on public.scores (mode);

-- ============ DÜELLOLAR ============
create table if not exists public.duels (
  code             text primary key,
  seed             bigint not null,
  status           text not null default 'open',   -- 'open' | 'done'
  mode             text not null default 'classic', -- classic | target | survival | coop
  target_device    text,                            -- davet edilen arkadaşın cihazı (varsa)
  creator_nick     text,
  creator_device   text,
  creator_score    integer,
  challenger_nick  text,
  challenger_device text,
  challenger_score integer,
  created_at       timestamptz not null default now()
);
-- Var olan tabloya kolon eklemek için (idempotent):
alter table public.duels add column if not exists mode text not null default 'classic';
alter table public.duels add column if not exists target_device text;
create index if not exists duels_target_idx on public.duels (target_device);

-- ============ PROFİLLER (arkadaşlık + market + profil görüntüleme) ============
create table if not exists public.profiles (
  device      text primary key,
  code        text unique not null,     -- 6 haneli arkadaş kodu
  nickname    text not null,
  coins       integer not null default 0,
  skin        text not null default 'fruit',
  owned       jsonb not null default '["fruit"]'::jsonb,
  best        integer not null default 0,
  wins        integer not null default 0,
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_nick_idx on public.profiles (lower(nickname));

alter table public.profiles enable row level security;
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (true);
create policy "profiles_update" on public.profiles for update using (true) with check (true);

-- Realtime'ı açmak için (Supabase panel → Database → Replication → duels tablosunu ekle),
-- ya da: alter publication supabase_realtime add table public.duels;

-- ============ GÜVENLİK (RLS) ============
-- Takma ad sistemi (giriş yok) olduğundan anon kullanıcıya yazma/okuma izni veriyoruz.
alter table public.scores enable row level security;
alter table public.duels  enable row level security;

-- Skorlar: herkes okur, herkes ekler (güncelleme/silme yok)
create policy "scores_read"   on public.scores for select using (true);
create policy "scores_insert" on public.scores for insert with check (true);

-- Düellolar: herkes okur, ekler ve günceller (skor girmek için)
create policy "duels_read"   on public.duels for select using (true);
create policy "duels_insert" on public.duels for insert with check (true);
create policy "duels_update" on public.duels for update using (true) with check (true);

-- ============ (opsiyonel) ESKİ DÜELLO TEMİZLİĞİ ============
-- 7 günden eski düelloları silmek istersen Supabase'de bir cron/Edge Function ekleyebilirsin.
-- delete from public.duels where created_at < now() - interval '7 days';
