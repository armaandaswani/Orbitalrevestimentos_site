-- Migration 005: project_media table for additional photos and videos per obra
-- Run this in your Supabase SQL editor.

CREATE TABLE IF NOT EXISTS project_media (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_slug TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'image',  -- 'image' | 'video'
  url         TEXT NOT NULL,
  caption     TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_media_slug ON project_media(project_slug);
