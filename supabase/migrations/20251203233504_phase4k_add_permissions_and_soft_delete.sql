/*
  # Phase 4K: Add new permissions and soft delete

  1. New Permissions for Users
    - can_manage_appointments: Allow barbers to edit/delete any appointment
    - can_manage_clients: Allow barbers to add/edit/delete clients
   
  2. Soft Delete for Clients
    - is_deleted: Boolean flag for soft-deleting clients with appointment history
   
  3. Notes Column for Clients
    - notes: Text field for client notes (general info, preferences, etc.)
*/

-- Add new permission columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS can_manage_appointments boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_clients boolean DEFAULT false;

-- Add soft delete and notes columns to clients table  
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Create index on is_deleted for efficient filtering
CREATE INDEX IF NOT EXISTS idx_clients_is_deleted ON public.clients(is_deleted) WHERE is_deleted = false;