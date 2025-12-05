/*
  # Add notes field to appointments table
  
  1. Changes
    - Add `notes` text field to appointments table for storing cancellation reasons and other notes
  
  2. Notes
    - Field is nullable to maintain backward compatibility
    - Can be used to store structured or unstructured text about the appointment
*/

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN appointments.notes IS 'Notes about the appointment, including cancellation reasons';
