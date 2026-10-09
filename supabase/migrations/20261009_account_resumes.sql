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
