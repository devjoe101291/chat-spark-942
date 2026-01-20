-- Create push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (user_id = auth.uid());

-- Service role can read all subscriptions (for sending notifications)
CREATE POLICY "Service role can read all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for push subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;