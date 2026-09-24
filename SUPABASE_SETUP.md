# Account setup (Supabase)

## 1. Create project
https://supabase.com → New project (free tier is fine)

## 2. Auth providers
Authentication → Providers:
- Email: enabled
- Google: enable and add Google OAuth Client ID/Secret from Google Cloud Console
  Authorized redirect URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`

Site URL (Authentication → URL configuration): `https://ard-helper.vercel.app`
Redirect URLs: `https://ard-helper.vercel.app/**`

## 3. SQL (SQL Editor → New query → Run)

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  state text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  grade text,
  needs text,
  notes text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.children enable row level security;

create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users upsert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users read own children" on public.children
  for select using (auth.uid() = user_id);
create policy "Users insert own children" on public.children
  for insert with check (auth.uid() = user_id);
create policy "Users update own children" on public.children
  for update using (auth.uid() = user_id);
create policy "Users delete own children" on public.children
  for delete using (auth.uid() = user_id);
```

## 4. Vercel env vars
Project → Settings → Environment Variables (Production):

- `SUPABASE_URL` = Project URL (Settings → API)
- `SUPABASE_ANON_KEY` = anon / public key

Redeploy after saving.

## 5. Local demo
Without Supabase keys, the Account tab still works in **local browser storage** so you can try profiles and children immediately.
