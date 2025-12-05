/*
  # Add Commissions, Inventory, Acquisition & Retention Tracking

  ## New Features
  
  ### 1. Commissions & Payouts
  - Add commission fields to appointment_products for line-item tracking
  - Add commission fields to appointments for service commissions
  - Fields: commission_percent, commission_amount, due_to_barber, due_to_shop
  
  ### 2. Inventory Management
  - Extend products table with inventory tracking fields
  - Create inventory_transactions table for stock movements
  - Track: current stock, thresholds, SKU, supplier info
  
  ### 3. Client Acquisition & Retention
  - Add acquisition channel tracking to clients
  - Add visit tracking: first_visit_at, last_visit_at, visits_count
  - Add retention flags: only_prepay_allowed
  
  ### 4. Booking Rules & Settings
  - Extend shop_config with booking rules
  - Add commission configuration
  - Add tip configuration
  
  ### 5. Barber Permissions
  - Add can_send_sms permission to users table
  
  ## Security
  - All RLS policies inherited from existing tables
  - New tables get appropriate RLS policies
*/

-- =====================================================
-- 1. COMMISSIONS: Add commission fields to appointments
-- =====================================================

-- Add commission fields for services
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_commission_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_commission_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_due_to_barber numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_due_to_shop numeric DEFAULT 0;

-- Add commission fields to appointment_products
ALTER TABLE appointment_products
  ADD COLUMN IF NOT EXISTS commission_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_to_barber numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_to_shop numeric DEFAULT 0;

-- =====================================================
-- 2. INVENTORY: Extend products table
-- =====================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS retail_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supply_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ecommerce_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_stock integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS high_stock_threshold integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS add_to_register boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS card_fee_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_fee_amount numeric DEFAULT 0;

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('SALE', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'THEFT')),
  quantity_change integer NOT NULL,
  stock_after integer NOT NULL,
  reason text,
  notes text,
  created_by_user_id uuid REFERENCES users(id),
  appointment_id uuid REFERENCES appointments(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and add policies for inventory_transactions
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inventory transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);

-- =====================================================
-- 3. ACQUISITION & RETENTION: Extend clients table
-- =====================================================

-- Add acquisition and retention tracking
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS acquisition_channel text CHECK (acquisition_channel IN (
    'BARBER_LINK', 
    'GOOGLE_ONLINE', 
    'WALK_IN', 
    'REFERRAL', 
    'SOCIAL_MEDIA', 
    'OTHER'
  )),
  ADD COLUMN IF NOT EXISTS first_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz,
  ADD COLUMN IF NOT EXISTS visits_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS only_prepay_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Create index for retention queries
CREATE INDEX IF NOT EXISTS idx_clients_last_visit_at ON clients(last_visit_at);
CREATE INDEX IF NOT EXISTS idx_clients_acquisition_channel ON clients(acquisition_channel);

-- =====================================================
-- 4. BOOKING RULES: Extend shop_config
-- =====================================================

ALTER TABLE shop_config
  ADD COLUMN IF NOT EXISTS allow_booking_without_payment boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_multiple_services boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_any_barber boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_booking_interval_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS barber_booking_interval_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS days_bookable_in_advance integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS min_book_ahead_hours integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS min_cancel_ahead_hours integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS allow_group_appointments boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_21_plus boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gross_up_card_fees boolean DEFAULT false;

-- Add tip configuration
ALTER TABLE shop_config
  ADD COLUMN IF NOT EXISTS tip_percent_options jsonb DEFAULT '[15, 18, 20, 25]'::jsonb,
  ADD COLUMN IF NOT EXISTS tip_flat_options jsonb DEFAULT '[5, 10, 15, 20]'::jsonb,
  ADD COLUMN IF NOT EXISTS show_tip_in_booking boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_tip_in_confirmation boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_tax_in_tip_calc boolean DEFAULT false;

-- Add commission configuration (tiers stored as JSONB)
ALTER TABLE shop_config
  ADD COLUMN IF NOT EXISTS commission_config jsonb DEFAULT '{
    "service_tiers": [
      {"min": 0, "max": 1000, "percent": 50},
      {"min": 1000, "max": 2000, "percent": 55},
      {"min": 2000, "max": 5000, "percent": 60},
      {"min": 5000, "max": 10000, "percent": 65},
      {"min": 10000, "max": null, "percent": 70}
    ],
    "product_tiers": [
      {"min": 0, "max": 500, "percent": 20},
      {"min": 500, "max": 1000, "percent": 25},
      {"min": 1000, "max": 2500, "percent": 30},
      {"min": 2500, "max": 5000, "percent": 35},
      {"min": 5000, "max": null, "percent": 40}
    ],
    "cumulative": false
  }'::jsonb;

-- Add retention thresholds
ALTER TABLE shop_config
  ADD COLUMN IF NOT EXISTS regular_client_min_visits integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS lapsed_client_days integer DEFAULT 90;

-- =====================================================
-- 5. BARBER PERMISSIONS: Add SMS permission
-- =====================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_send_sms boolean DEFAULT false;

-- =====================================================
-- 6. SERVICES: Add online visibility and prepay fields
-- =====================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS visible_online boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS prepay_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS card_fee_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_fee_amount numeric DEFAULT 0;

-- =====================================================
-- 7. BARBER-SERVICE ASSIGNMENT: New junction table
-- =====================================================

CREATE TABLE IF NOT EXISTS barber_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(barber_id, service_id)
);

ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read barber services"
  ON barber_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage barber services"
  ON barber_services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_barber_services_barber_id ON barber_services(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_service_id ON barber_services(service_id);
