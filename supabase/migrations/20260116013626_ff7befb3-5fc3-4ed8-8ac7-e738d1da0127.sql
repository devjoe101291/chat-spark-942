-- Drop the overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create a more restrictive policy: users can see their own profile OR profiles of people in shared conversations
CREATE POLICY "Users can view profiles in shared conversations"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_members cm1
      JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.user_id
    )
  );

-- Create a secure RPC function for user search that returns limited data
-- This allows starting new conversations while protecting privacy
CREATE OR REPLACE FUNCTION public.search_users_for_chat(search_query text, result_limit int DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF search_query IS NULL OR length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;
  
  -- Limit results to prevent data harvesting
  IF result_limit > 20 THEN
    result_limit := 20;
  END IF;
  
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id != auth.uid()
    AND p.display_name ILIKE '%' || trim(search_query) || '%'
  ORDER BY p.display_name
  LIMIT result_limit;
END;
$$;