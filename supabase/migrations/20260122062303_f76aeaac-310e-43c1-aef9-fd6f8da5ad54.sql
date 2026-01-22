-- Ensure conversations.created_by is always set for new rows
ALTER TABLE public.conversations
  ALTER COLUMN created_by SET DEFAULT auth.uid();