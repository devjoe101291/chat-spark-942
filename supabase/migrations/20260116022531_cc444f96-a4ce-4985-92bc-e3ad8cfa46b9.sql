-- Fix SQL injection vulnerability in search_users_for_chat function
-- Escape LIKE special characters (%, _, \) to prevent SQL injection

CREATE OR REPLACE FUNCTION public.search_users_for_chat(
  search_query text,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escaped_query text;
BEGIN
  -- Validate inputs
  IF search_query IS NULL OR length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;

  -- Limit results to prevent data harvesting
  IF result_limit > 20 THEN
    result_limit := 20;
  END IF;

  -- Escape LIKE special characters to prevent SQL injection
  escaped_query := replace(replace(replace(trim(search_query),
    '\', '\\'),    -- Escape backslash first
    '%', '\%'),    -- Escape percent
    '_', '\_');    -- Escape underscore

  RETURN QUERY
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id != auth.uid()
    AND p.display_name ILIKE '%' || escaped_query || '%'
  ORDER BY p.display_name
  LIMIT result_limit;
END;
$$;