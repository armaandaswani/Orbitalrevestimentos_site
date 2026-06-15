-- Migration 016: CRM Phase 3 — recurring reminders
--
-- The reminder system (migration 012: next_reminder_at / reminder_note /
-- reminder_sent_at) fired once per lead. This adds an optional recurrence so a
-- follow-up can repeat automatically: when the WhatsApp-reminders cron sends a
-- due recurring reminder it advances next_reminder_at to the next occurrence
-- instead of just marking it sent. Snooze and the in-app inbox are pure UI on
-- top of next_reminder_at and need no schema change.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS reminder_recur TEXT NOT NULL DEFAULT 'none'
  CHECK (reminder_recur IN ('none', 'daily', 'weekly', 'monthly'));
