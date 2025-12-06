import { supabase } from './supabase';

type ShopConfig = {
  days_bookable_in_advance: number;
  min_book_ahead_hours: number;
  min_cancel_ahead_hours: number;
  client_booking_interval_minutes: number;
};

type BarberOverrides = {
  min_hours_before_booking_override: number | null;
  min_hours_before_cancellation_override: number | null;
  booking_interval_minutes_override: number | null;
};

type BookingValidationError = {
  field: string;
  message: string;
  messageEs: string;
};

export async function getShopConfig(): Promise<ShopConfig | null> {
  const { data, error } = await supabase
    .from('shop_config')
    .select('days_bookable_in_advance, min_book_ahead_hours, min_cancel_ahead_hours, client_booking_interval_minutes')
    .single();

  if (error) {
    console.error('Error fetching shop config:', error);
    return null;
  }

  return data;
}

async function getBarberOverrides(barberId: string | null): Promise<BarberOverrides | null> {
  if (!barberId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('min_hours_before_booking_override, min_hours_before_cancellation_override, booking_interval_minutes_override')
    .eq('id', barberId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching barber overrides:', error);
    return null;
  }

  return data;
}

export async function validateBookingRules(
  startTime: Date,
  action: 'create' | 'cancel' | 'reschedule',
  barberId?: string | null
): Promise<BookingValidationError | null> {
  const config = await getShopConfig();
  if (!config) {
    return {
      field: 'config',
      message: 'Unable to load booking rules',
      messageEs: 'No se pudieron cargar las reglas de reserva',
    };
  }

  const barberOverrides = await getBarberOverrides(barberId || null);

  const minBookAheadHours = barberOverrides?.min_hours_before_booking_override ?? config.min_book_ahead_hours;
  const minCancelAheadHours = barberOverrides?.min_hours_before_cancellation_override ?? config.min_cancel_ahead_hours;
  const intervalMinutes = barberOverrides?.booking_interval_minutes_override ?? config.client_booking_interval_minutes;

  const now = new Date();
  const msUntilAppointment = startTime.getTime() - now.getTime();
  const hoursUntilAppointment = msUntilAppointment / (1000 * 60 * 60);
  const daysUntilAppointment = msUntilAppointment / (1000 * 60 * 60 * 24);

  if (action === 'create' || action === 'reschedule') {
    if (daysUntilAppointment > config.days_bookable_in_advance) {
      return {
        field: 'start_time',
        message: `Appointments can only be booked up to ${config.days_bookable_in_advance} days in advance`,
        messageEs: `Las citas solo se pueden reservar con hasta ${config.days_bookable_in_advance} días de anticipación`,
      };
    }

    if (hoursUntilAppointment < minBookAheadHours) {
      return {
        field: 'start_time',
        message: `Appointments must be booked at least ${minBookAheadHours} hour(s) in advance`,
        messageEs: `Las citas deben reservarse con al menos ${minBookAheadHours} hora(s) de anticipación`,
      };
    }

    const minutes = startTime.getMinutes();
    if (minutes % intervalMinutes !== 0) {
      return {
        field: 'start_time',
        message: `Appointment times must be at ${intervalMinutes}-minute intervals (e.g., :00, :${intervalMinutes}, :${intervalMinutes * 2}, etc.)`,
        messageEs: `Los horarios de las citas deben estar en intervalos de ${intervalMinutes} minutos (ej., :00, :${intervalMinutes}, :${intervalMinutes * 2}, etc.)`,
      };
    }
  }

  if (action === 'cancel' || action === 'reschedule') {
    if (hoursUntilAppointment < minCancelAheadHours) {
      return {
        field: 'start_time',
        message: `This appointment can no longer be cancelled online. It must be cancelled at least ${minCancelAheadHours} hour(s) in advance. Please call the shop.`,
        messageEs: `Esta cita ya no se puede cancelar en línea. Debe cancelarse con al menos ${minCancelAheadHours} hora(s) de anticipación. Por favor llame a la tienda.`,
      };
    }
  }

  return null;
}

export function formatBookingRuleError(error: BookingValidationError | null, language: 'en' | 'es'): string {
  if (!error) return '';
  return language === 'en' ? error.message : error.messageEs;
}
