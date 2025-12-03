/*
  # Create Initial Schema for Lupe's Barber Control Panel

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `email` (text, unique)
      - `role` (text: 'OWNER' | 'BARBER')
      - `language` (text: 'en' | 'es')
      - `active` (boolean)
      - Permission flags for owner/barber capabilities
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `clients`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `email` (text)
      - `language` (text: 'en' | 'es')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `services`
      - `id` (uuid, primary key)
      - `name_en` (text)
      - `name_es` (text)
      - `description_en` (text, nullable)
      - `description_es` (text, nullable)
      - `base_price` (numeric)
      - `duration_minutes` (integer)
      - `active` (boolean)
    
    - `appointments`
      - `id` (uuid, primary key)
      - `client_id` (uuid, fk -> clients.id)
      - `barber_id` (uuid, fk -> users.id)
      - `service_id` (uuid, fk -> services.id)
      - `scheduled_start` (timestamp)
      - `scheduled_end` (timestamp)
      - `status` (text: 'booked' | 'completed' | 'no_show' | 'cancelled')
      - `channel` (text: 'online_pwa' | 'internal_manual' | 'voice_agent')
      - Financial fields (services_total, products_total, tax, tip, fees, etc.)
      - `rating` (integer, nullable)
      - `review_comment` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `completed_at` (timestamp, nullable)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on role
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER', 'BARBER')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
  active boolean DEFAULT true,
  can_view_shop_reports boolean DEFAULT false,
  can_view_own_stats boolean DEFAULT false,
  can_manage_services boolean DEFAULT false,
  can_manage_products boolean DEFAULT false,
  can_manage_barbers boolean DEFAULT false,
  can_manage_schedules boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data and owners can read all users
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  );

-- Only owners can insert users
CREATE POLICY "Owners can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  );

-- Users can update their own data, owners can update all users
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  )
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  );

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all clients
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert clients
CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update clients
CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_es text NOT NULL,
  description_en text,
  description_es text,
  base_price numeric NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  active boolean DEFAULT true
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Anyone can read active services
CREATE POLICY "Anyone can read active services"
  ON services FOR SELECT
  USING (active = true);

-- Only owners can insert services
CREATE POLICY "Owners can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  );

-- Only owners can update services
CREATE POLICY "Owners can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  );

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  barber_id uuid NOT NULL REFERENCES users(id),
  service_id uuid NOT NULL REFERENCES services(id),
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'no_show', 'cancelled')),
  channel text NOT NULL DEFAULT 'online_pwa' CHECK (channel IN ('online_pwa', 'internal_manual', 'voice_agent')),
  services_total numeric DEFAULT 0,
  products_total numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  tip_amount numeric DEFAULT 0,
  card_fee_amount numeric DEFAULT 0,
  total_charged numeric DEFAULT 0,
  net_revenue numeric DEFAULT 0,
  payment_method text,
  paid_at timestamptz,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read appointments
CREATE POLICY "Authenticated users can read appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert appointments
CREATE POLICY "Authenticated users can insert appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Barbers can update their own appointments, owners can update all
CREATE POLICY "Users can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    barber_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  )
  WITH CHECK (
    barber_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'OWNER'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_start ON appointments(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
