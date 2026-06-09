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
  creator_nick     text,
  creator_device   text,
  creator_score    integer,
  challenger_nick  text,
  challenger_device text,
  challenger_score integer,
  created_at       timestamptz not null default now()
);

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
