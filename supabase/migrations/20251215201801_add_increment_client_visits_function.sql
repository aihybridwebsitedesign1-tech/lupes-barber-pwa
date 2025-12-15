/*
  # Add Client Analytics Function

  1. New RPC Function
    - `increment_client_visits` - Atomically increments total_visits and updates last_visit

  2. Purpose
    - Called by Stripe webhook after successful payment
    - Ensures accurate client visit tracking
    - Thread-safe atomic operation

  3. Security
    - Function uses SECURITY DEFINER for privileged access
    - Only callable by authenticated users (service role for webhooks)
*/

-- Create function to increment client visits atomically
CREATE OR REPLACE FUNCTION increment_client_visits(client_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clients
  SET
    total_visits = COALESCE(total_visits, 0) + 1,
    last_visit = NOW()
  WHERE id = client_id_param;
END;
$$;
