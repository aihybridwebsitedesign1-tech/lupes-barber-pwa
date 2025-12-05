import { supabase } from './supabase';

type ShopConfig = {
  days_bookable_in_advance: number;
  min_book_ahead_hours: number;
  min_cancel_ahead_hours: number;
  client_booking_interval_minutes: number;
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

export async function validateBookingRules(
  startTime: Date,
  action: 'create' | 'cancel' | 'reschedule'
): Promise<BookingValidationError | null> {
  const config = await getShopConfig();
  if (!config) {
    return {
      field: 'config',
      message: 'Unable to load booking rules',
      messageEs: 'No se pudieron cargar las reglas de reserva',
    };
  }

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

    if (hoursUntilAppointment < config.min_book_ahead_hours) {
      return {
        field: 'start_time',
        message: `Appointments must be booked at least ${config.min_book_ahead_hours} hour(s) in advance`,
        messageEs: `Las citas deben reservarse con al menos ${config.min_book_ahead_hours} hora(s) de anticipación`,
      };
    }

    const minutes = startTime.getMinutes();
    const intervalMinutes = config.client_booking_interval_minutes;
    if (minutes % intervalMinutes !== 0) {
      return {
        field: 'start_time',
        message: `Appointment times must be at ${intervalMinutes}-minute intervals (e.g., :00, :${intervalMinutes}, :${intervalMinutes * 2}, etc.)`,
        messageEs: `Los horarios de las citas deben estar en intervalos de ${intervalMinutes} minutos (ej., :00, :${intervalMinutes}, :${intervalMinutes * 2}, etc.)`,
      };
    }
  }

  if (action === 'cancel' || action === 'reschedule') {
    if (hoursUntilAppointment < config.min_cancel_ahead_hours) {
      return {
        field: 'start_time',
        message: `This appointment can no longer be cancelled online. It must be cancelled at least ${config.min_cancel_ahead_hours} hour(s) in advance. Please call the shop.`,
        messageEs: `Esta cita ya no se puede cancelar en línea. Debe cancelarse con al menos ${config.min_cancel_ahead_hours} hora(s) de anticipación. Por favor llame a la tienda.`,
      };
    }
  }

  return null;
}

export function formatBookingRuleError(error: BookingValidationError | null, language: 'en' | 'es'): string {
  if (!error) return '';
  return language === 'en' ? error.message : error.messageEs;
}
