/*
  # Create client_messages table for SMS/communication logging

  1. New Tables
    - `client_messages`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `phone_number` (text) - Phone number message was sent to
      - `message` (text) - Message content
      - `channel` (text) - Communication channel (e.g., 'sms', 'email')
      - `source` (text) - Where message originated (e.g., 'engage_manual', 'reminder_auto')
      - `twilio_sid` (text, nullable) - Twilio message SID if available
      - `status` (text) - Delivery status ('sent', 'disabled', 'error')
      - `error_message` (text, nullable) - Error details if status is error
      - `sent_by_user_id` (uuid, references users) - User who sent the message
      - `created_at` (timestamptz) - When message was created/sent

  2. Security
    - Enable RLS on `client_messages` table
    - Add policy for authenticated users to read messages
    - Add policy for authenticated users to insert messages
    - Owner can view all messages

  3. Indexes
    - Index on client_id for fast lookups
    - Index on created_at for time-based queries
    - Index on status for filtering
*/

CREATE TABLE IF NOT EXISTS client_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  source text NOT NULL DEFAULT 'engage_manual',
  twilio_sid text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  sent_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read messages"
  ON client_messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON client_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_client_messages_client_id ON client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_created_at ON client_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_messages_status ON client_messages(status);
