-- CineTube migration script: Add is_main column to movies table
-- Run this in your Supabase SQL Editor to enable main page selection!

alter table public.movies
add column is_main boolean not null default false;










