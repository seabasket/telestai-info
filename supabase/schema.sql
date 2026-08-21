-- Schema for telestai.info's original email-OTP account tables.
-- Not part of the Jekyll build (excluded in _config.yml).
--
-- Current sign-in is phone-number based -- run supabase/phone_auth.sql
-- (additive) in the SQL Editor for that. This file remains the setup
-- for the older email-OTP tables (profiles / unlocked_codes) if you
-- still want those around; they are unused by the live UI.
--
-- Run once in the Supabase SQL Editor after creating a fresh project.

-- One row per account, extending Supabase's built-in auth.users.
-- phone is unverified -- captured for future SMS use, not usable for login
-- yet. username is chosen at first sign-in and is what the terminal prompt
-- shows once signed in (see assets/js/account.js / index.html).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner can select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id);

-- Deliberately no public-read policy: Postgres RLS is row-level, not
-- column-level, so "let anyone read the username column" would actually
-- mean "let anyone read every column, including phone." Username
-- uniqueness is enforced by the `unique` constraint above instead -- the
-- client attempts to set a username, and a constraint-violation error
-- means "taken, try another."

-- Auto-create the profile row the moment someone signs up (first OTP
-- verification for a new email creates the auth.users row, which fires
-- this trigger).
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- One row per (account, code) successfully unlocked. Insert-only ledger --
-- codes never get "re-locked" once unlocked, so no update/delete policy is
-- needed.
create table public.unlocked_codes (
  account_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  unlocked_at timestamptz not null default now(),
  primary key (account_id, slug)
);

alter table public.unlocked_codes enable row level security;

create policy "unlocked_codes: owner can select"
  on public.unlocked_codes for select
  using (auth.uid() = account_id);

create policy "unlocked_codes: owner can insert"
  on public.unlocked_codes for insert
  with check (auth.uid() = account_id);
