create table if not exists public.published_resumes (
  slug text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '이력서',
  document jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.published_resumes enable row level security;

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
