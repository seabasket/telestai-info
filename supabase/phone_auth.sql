-- Phone-number accounts for telestai.info (no email, no SMS/OTP).
--
-- Run this once in the Supabase SQL Editor after the original schema.sql.
-- It is additive and idempotent -- safe to re-run.
--
-- Sign-in is "know the phone number": there is no verification code.
-- Anyone who can type a number can load that number's unlocked-page list.
-- That matches the rest of the site (access codes are unlisted, not private).

create table if not exists public.phone_accounts (
  phone text primary key,
  username text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.phone_unlocked (
  phone text not null references public.phone_accounts(phone) on delete cascade,
  slug text not null,
  unlocked_at timestamptz not null default now(),
  primary key (phone, slug)
);

alter table public.phone_accounts enable row level security;
alter table public.phone_unlocked enable row level security;

-- No direct table policies for anon: every read/write goes through
-- phone_session() below, which takes the phone as the credential.

create or replace function public.phone_session(
  p_phone text,
  p_username text default null,
  p_slugs text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n text;
  digits text;
  uname text;
  slugs jsonb;
begin
  digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(digits) = 10 then
    digits := '1' || digits;
  end if;
  if length(digits) < 11 or length(digits) > 15 then
    raise exception 'invalid phone' using errcode = '22023';
  end if;
  n := '+' || digits;

  insert into public.phone_accounts (phone) values (n)
    on conflict (phone) do nothing;

  if p_username is not null then
    begin
      update public.phone_accounts
         set username = nullif(btrim(p_username), '')
       where phone = n;
    exception when unique_violation then
      raise exception 'username taken' using errcode = '23505';
    end;
  end if;

  if p_slugs is not null then
    insert into public.phone_unlocked (phone, slug)
    select n, s
      from unnest(p_slugs) as s
     where s is not null and btrim(s) <> ''
    on conflict do nothing;
  end if;

  select username into uname from public.phone_accounts where phone = n;
  select coalesce(jsonb_agg(slug order by unlocked_at), '[]'::jsonb)
    into slugs
    from public.phone_unlocked
   where phone = n;

  return jsonb_build_object('phone', n, 'username', uname, 'slugs', slugs);
end;
$$;

revoke all on function public.phone_session(text, text, text[]) from public;
grant execute on function public.phone_session(text, text, text[]) to anon, authenticated;
