-- First, drop all existing policies that are restrictive
DROP POLICY IF EXISTS "Users can view profiles in shared conversations" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view conversations they are members of" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Conversation creators can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.conversation_members;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

DROP POLICY IF EXISTS "Users can view typing in their conversations" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their typing status" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their own typing indicator" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can delete their own typing indicator" ON public.typing_indicators;

-- Recreate PROFILES policies as PERMISSIVE
-- IMPORTANT: Users must be able to view their own profile AND profiles in shared conversations
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view profiles in shared conversations" ON public.profiles
  FOR SELECT USING (users_share_conversation(auth.uid(), user_id));

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Recreate CONVERSATIONS policies as PERMISSIVE
CREATE POLICY "Users can view conversations they are members of" ON public.conversations
  FOR SELECT USING (is_conversation_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update conversations" ON public.conversations
  FOR UPDATE USING (is_conversation_admin(id, auth.uid()));

-- Recreate CONVERSATION_MEMBERS policies as PERMISSIVE
CREATE POLICY "Users can view members of their conversations" ON public.conversation_members
  FOR SELECT USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Conversation creators can add members" ON public.conversation_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_members.conversation_id AND c.created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can update member roles" ON public.conversation_members
  FOR UPDATE USING (is_conversation_admin(conversation_id, auth.uid()))
  WITH CHECK (is_conversation_admin(conversation_id, auth.uid()));

CREATE POLICY "Admins can remove members" ON public.conversation_members
  FOR DELETE USING (
    is_conversation_admin(conversation_id, auth.uid())
    OR user_id = auth.uid()
  );

-- Recreate MESSAGES policies as PERMISSIVE
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages to their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_conversation_member(conversation_id, auth.uid())
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Recreate TYPING_INDICATORS policies as PERMISSIVE
CREATE POLICY "Users can view typing in their conversations" ON public.typing_indicators
  FOR SELECT USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can update their typing status" ON public.typing_indicators
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own typing indicator" ON public.typing_indicators
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own typing indicator" ON public.typing_indicators
  FOR DELETE USING (auth.uid() = user_id);