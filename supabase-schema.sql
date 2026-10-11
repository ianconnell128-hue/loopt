-- Supabase Schema for Shorts App
-- Execute this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Videos Table
create table if not exists public.videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  username text not null,
  avatar_url text,
  title text not null,
  description text default '',
  video_url text not null,
  song_title text default 'Original Audio',
  likes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Likes Table
create table if not exists public.video_likes (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(video_id, user_id)
);

-- 4. Comments Table
create table if not exists public.video_comments (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  username text not null,
  avatar_url text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Row Level Security (RLS)
alter table public.videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.video_comments enable row level security;

-- Public can read all videos
create policy "Anyone can view videos"
  on public.videos for select
  using (true);

-- Authenticated users or anon can insert videos
create policy "Anyone can insert videos"
  on public.videos for insert
  with check (true);

-- Storage bucket for videos
insert into storage.buckets (id, name, public) 
values ('videos', 'videos', true)
on conflict (id) do nothing;

create policy "Public video access"
  on storage.objects for select
  using (bucket_id = 'videos');

create policy "Public video upload"
  on storage.objects for insert
  with check (bucket_id = 'videos');
