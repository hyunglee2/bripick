create table if not exists public.published_resumes (
  slug text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '이력서',
  document jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.published_resumes enable row level security;

-- 새 테이블 자동 노출을 끈 프로젝트에서는 Data API 역할의 테이블 권한을
-- 직접 부여해야 합니다. 실제 행 접근 범위는 아래 RLS 정책이 제한합니다.
grant select on table public.published_resumes to anon, authenticated;
grant insert, update, delete on table public.published_resumes to authenticated;

drop policy if exists "published resumes are publicly readable" on public.published_resumes;
create policy "published resumes are publicly readable"
on public.published_resumes for select using (true);

drop policy if exists "owners can publish resumes" on public.published_resumes;
create policy "owners can publish resumes"
on public.published_resumes for insert to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "owners can update published resumes" on public.published_resumes;
create policy "owners can update published resumes"
on public.published_resumes for update to authenticated
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owners can unpublish resumes" on public.published_resumes;
create policy "owners can unpublish resumes"
on public.published_resumes for delete to authenticated
using (auth.uid() = owner_id);

create index if not exists published_resumes_owner_id_idx
on public.published_resumes(owner_id);

create table if not exists public.resumes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null default '이력서',
  document jsonb not null,
  position integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

alter table public.resumes enable row level security;

grant select, insert, update, delete on table public.resumes to authenticated;

drop policy if exists "owners can read resumes" on public.resumes;
create policy "owners can read resumes"
on public.resumes for select to authenticated
using (auth.uid() = owner_id);

drop policy if exists "owners can create resumes" on public.resumes;
create policy "owners can create resumes"
on public.resumes for insert to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "owners can update resumes" on public.resumes;
create policy "owners can update resumes"
on public.resumes for update to authenticated
using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owners can delete resumes" on public.resumes;
create policy "owners can delete resumes"
on public.resumes for delete to authenticated
using (auth.uid() = owner_id);

create index if not exists resumes_owner_position_idx
on public.resumes(owner_id, position);
