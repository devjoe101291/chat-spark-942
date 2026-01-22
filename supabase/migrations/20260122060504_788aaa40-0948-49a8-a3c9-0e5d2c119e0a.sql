-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

-- Recreate as permissive policy
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);