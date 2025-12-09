/*
  # Add Generate Demo Data Function

  1. New Function
    - `generate_demo_data()` - Creates realistic demo data
    - Generates demo barbers, clients, services, products, appointments

  2. Security
    - SECURITY DEFINER to allow data creation
    - Verifies caller is OWNER role
    - Logs operation to audit table

  3. Demo Data Includes
    - 3 demo barbers
    - 10 demo clients
    - 5 demo services
    - 5 demo products
    - 20 demo appointments (past and future)
    - Realistic analytics and revenue data
*/

-- Function: Generate Demo Data
CREATE OR REPLACE FUNCTION generate_demo_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_result JSONB;
  v_barber1_id UUID;
  v_barber2_id UUID;
  v_barber3_id UUID;
  v_client_ids UUID[];
  v_service_ids UUID[];
  v_product_ids UUID[];
  v_appointments_created INTEGER := 0;
  v_services_created INTEGER := 0;
  v_products_created INTEGER := 0;
  v_barbers_created INTEGER := 0;
  v_clients_created INTEGER := 0;
  v_i INTEGER;
  v_appt_date TIMESTAMPTZ;
  v_appt_time TEXT;
  v_barber_id UUID;
  v_client_id UUID;
  v_service_id UUID;
BEGIN
  -- Verify caller is owner
  SELECT id INTO v_owner_id
  FROM users
  WHERE id = auth.uid()
  AND role = 'OWNER';

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only owners can generate demo data'
    );
  END IF;

  -- Create demo barbers (only if they don't exist)
  INSERT INTO users (name, email, phone, role, is_active, commission_rate_override, show_on_client_site, accept_online_bookings)
  VALUES
    ('Carlos Rodriguez', 'carlos.demo@lupesbarber.com', '555-0101', 'BARBER', true, 0.50, true, true),
    ('Miguel Santos', 'miguel.demo@lupesbarber.com', '555-0102', 'BARBER', true, 0.55, true, true),
    ('Antonio Garcia', 'antonio.demo@lupesbarber.com', '555-0103', 'BARBER', true, 0.45, true, true)
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_barber1_id;

  -- Get barber IDs
  SELECT id INTO v_barber1_id FROM users WHERE email = 'carlos.demo@lupesbarber.com';
  SELECT id INTO v_barber2_id FROM users WHERE email = 'miguel.demo@lupesbarber.com';
  SELECT id INTO v_barber3_id FROM users WHERE email = 'antonio.demo@lupesbarber.com';

  IF v_barber1_id IS NOT NULL THEN
    v_barbers_created := v_barbers_created + 1;
  END IF;
  IF v_barber2_id IS NOT NULL THEN
    v_barbers_created := v_barbers_created + 1;
  END IF;
  IF v_barber3_id IS NOT NULL THEN
    v_barbers_created := v_barbers_created + 1;
  END IF;

  -- Create demo services
  INSERT INTO services (name_en, name_es, price, duration_minutes, is_active, description_en, description_es)
  VALUES
    ('Classic Haircut', 'Corte Clásico', 25.00, 30, true, 'Traditional barbershop haircut with clippers and scissors', 'Corte de barbería tradicional con máquina y tijeras'),
    ('Fade Haircut', 'Corte Fade', 30.00, 45, true, 'Modern fade haircut with precise blending', 'Corte fade moderno con degradado preciso'),
    ('Beard Trim', 'Recorte de Barba', 15.00, 20, true, 'Professional beard shaping and trim', 'Arreglo y recorte profesional de barba'),
    ('Haircut + Beard', 'Corte + Barba', 40.00, 60, true, 'Complete grooming package', 'Paquete completo de cuidado personal'),
    ('Kids Haircut', 'Corte para Niños', 20.00, 25, true, 'Haircut for children 12 and under', 'Corte de cabello para niños de 12 años o menos')
  ON CONFLICT DO NOTHING
  RETURNING id INTO STRICT v_service_ids;

  GET DIAGNOSTICS v_services_created = ROW_COUNT;

  -- Get service IDs if they already exist
  SELECT ARRAY_AGG(id) INTO v_service_ids FROM services LIMIT 5;

  -- Create demo products
  INSERT INTO products (name, quantity, retail_price, cost_price, low_stock_alert, category)
  VALUES
    ('Premium Hair Pomade', 15, 18.00, 8.00, 5, 'Styling'),
    ('Beard Oil', 20, 15.00, 6.00, 5, 'Grooming'),
    ('Hair Wax', 12, 12.00, 5.00, 5, 'Styling'),
    ('Shaving Cream', 18, 10.00, 4.00, 5, 'Grooming'),
    ('Aftershave Balm', 10, 14.00, 6.00, 5, 'Grooming')
  ON CONFLICT DO NOTHING
  RETURNING id INTO STRICT v_product_ids;

  GET DIAGNOSTICS v_products_created = ROW_COUNT;

  -- Get product IDs if they already exist
  SELECT ARRAY_AGG(id) INTO v_product_ids FROM products LIMIT 5;

  -- Create demo clients
  FOR v_i IN 1..10 LOOP
    INSERT INTO clients (first_name, last_name, phone, email, notes)
    VALUES
      (
        CASE v_i
          WHEN 1 THEN 'John'
          WHEN 2 THEN 'Michael'
          WHEN 3 THEN 'David'
          WHEN 4 THEN 'James'
          WHEN 5 THEN 'Robert'
          WHEN 6 THEN 'Daniel'
          WHEN 7 THEN 'Joseph'
          WHEN 8 THEN 'Christopher'
          WHEN 9 THEN 'Matthew'
          WHEN 10 THEN 'Andrew'
        END,
        CASE v_i
          WHEN 1 THEN 'Smith'
          WHEN 2 THEN 'Johnson'
          WHEN 3 THEN 'Williams'
          WHEN 4 THEN 'Brown'
          WHEN 5 THEN 'Jones'
          WHEN 6 THEN 'Garcia'
          WHEN 7 THEN 'Miller'
          WHEN 8 THEN 'Davis'
          WHEN 9 THEN 'Rodriguez'
          WHEN 10 THEN 'Martinez'
        END,
        '555-010' || v_i,
        'client' || v_i || '.demo@example.com',
        'Demo client'
      )
    ON CONFLICT (phone) DO NOTHING
    RETURNING id INTO v_client_id;

    IF v_client_id IS NOT NULL THEN
      v_client_ids := array_append(v_client_ids, v_client_id);
      v_clients_created := v_clients_created + 1;
    END IF;
  END LOOP;

  -- Get client IDs if they already exist
  IF array_length(v_client_ids, 1) IS NULL THEN
    SELECT ARRAY_AGG(id) INTO v_client_ids FROM clients WHERE email LIKE '%.demo@example.com' LIMIT 10;
  END IF;

  -- Create demo appointments (mix of past and future)
  FOR v_i IN 1..20 LOOP
    -- Mix of past (last 30 days) and future (next 30 days)
    IF v_i <= 10 THEN
      v_appt_date := (CURRENT_DATE - ((v_i * 3) || ' days')::INTERVAL)::TIMESTAMPTZ;
    ELSE
      v_appt_date := (CURRENT_DATE + (((v_i - 10) * 2) || ' days')::INTERVAL)::TIMESTAMPTZ;
    END IF;

    -- Set time between 9 AM and 5 PM
    v_appt_time := (9 + (v_i % 8))::TEXT || ':' || CASE WHEN v_i % 2 = 0 THEN '00' ELSE '30' END || ':00';
    v_appt_date := (DATE(v_appt_date) || ' ' || v_appt_time)::TIMESTAMPTZ;

    -- Rotate through barbers, clients, and services
    v_barber_id := CASE (v_i % 3)
      WHEN 0 THEN v_barber1_id
      WHEN 1 THEN v_barber2_id
      ELSE v_barber3_id
    END;

    v_client_id := v_client_ids[(v_i % array_length(v_client_ids, 1)) + 1];
    v_service_id := v_service_ids[(v_i % array_length(v_service_ids, 1)) + 1];

    INSERT INTO appointments (
      client_id,
      barber_id,
      service_id,
      appointment_date,
      status,
      payment_method,
      payment_status,
      tip_amount,
      source,
      is_test,
      notes
    )
    VALUES (
      v_client_id,
      v_barber_id,
      v_service_id,
      v_appt_date,
      CASE
        WHEN v_i <= 8 THEN 'completed'
        WHEN v_i <= 10 THEN 'cancelled'
        ELSE 'confirmed'
      END,
      CASE WHEN (v_i % 2) = 0 THEN 'cash' ELSE 'card' END,
      CASE
        WHEN v_i <= 8 THEN 'paid'
        WHEN v_i <= 10 THEN 'cancelled'
        ELSE 'pending'
      END,
      CASE WHEN v_i <= 8 AND (v_i % 3) = 0 THEN (5 + (v_i % 3) * 2.5) ELSE 0 END,
      'owner',
      true,
      'Demo appointment'
    );

    v_appointments_created := v_appointments_created + 1;
  END LOOP;

  -- Log the action
  INSERT INTO reset_actions_history (owner_id, action_type, details)
  VALUES (
    v_owner_id,
    'reset_all_non_core_data',
    jsonb_build_object(
      'action', 'generate_demo_data',
      'barbers_created', v_barbers_created,
      'clients_created', v_clients_created,
      'services_created', v_services_created,
      'products_created', v_products_created,
      'appointments_created', v_appointments_created,
      'timestamp', now()
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'barbers_created', v_barbers_created,
    'clients_created', v_clients_created,
    'services_created', v_services_created,
    'products_created', v_products_created,
    'appointments_created', v_appointments_created
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION generate_demo_data IS 'Generates realistic demo data for testing and demonstration';

GRANT EXECUTE ON FUNCTION generate_demo_data() TO authenticated;
