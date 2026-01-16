-- Fix infinite recursion in RLS policies
-- The policies have bugs like comparing conversation_members.conversation_id = conversation_members.conversation_id (itself)
-- and conversation_members.conversation_id = conversation_members.id (wrong column)

-- First, create helper functions using SECURITY DEFINER to avoid recursion

-- Function to check if user is member of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Function to check if user is admin of a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_admin(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Function to check if two users share any conversation
CREATE OR REPLACE FUNCTION public.users_share_conversation(_user_id1 uuid, _user_id2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm1
    JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = _user_id1
      AND cm2.user_id = _user_id2
  )
$$;

-- Drop and recreate conversation_members policies
DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Conversation creators can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.conversation_members;

CREATE POLICY "Users can view members of their conversations"
ON public.conversation_members
FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Conversation creators can add members"
ON public.conversation_members
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id AND created_by = auth.uid()
  ))
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can update member roles"
ON public.conversation_members
FOR UPDATE
USING (public.is_conversation_admin(conversation_id, auth.uid()))
WITH CHECK (public.is_conversation_admin(conversation_id, auth.uid()));

CREATE POLICY "Admins can remove members"
ON public.conversation_members
FOR DELETE
USING (
  public.is_conversation_admin(conversation_id, auth.uid())
  OR user_id = auth.uid()
);

-- Drop and recreate conversations policies
DROP POLICY IF EXISTS "Users can view conversations they are members of" ON public.conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;

CREATE POLICY "Users can view conversations they are members of"
ON public.conversations
FOR SELECT
USING (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "Admins can update conversations"
ON public.conversations
FOR UPDATE
USING (public.is_conversation_admin(id, auth.uid()));

-- Drop and recreate messages policies to use helper functions
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_member(conversation_id, auth.uid())
);

-- Drop and recreate typing_indicators policies
DROP POLICY IF EXISTS "Users can view typing in their conversations" ON public.typing_indicators;

CREATE POLICY "Users can view typing in their conversations"
ON public.typing_indicators
FOR SELECT
USING (public.is_conversation_member(conversation_id, auth.uid()));

-- Fix profiles policy for viewing shared conversations
DROP POLICY IF EXISTS "Users can view profiles in shared conversations" ON public.profiles;

CREATE POLICY "Users can view profiles in shared conversations"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.users_share_conversation(auth.uid(), user_id)
);