import { supabase } from './supabase';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

type ShopConfig = {
  days_bookable_in_advance: number;
  min_book_ahead_hours: number;
  min_cancel_ahead_hours: number;
  client_booking_interval_minutes: number;
};

type BarberScheduleDay = {
  day_of_week: number;
  active: boolean;
  start_time: string;
  end_time: string;
};

type BarberAppointment = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
};

type BarberTimeOff = {
  id: string;
  start_time: string;
  end_time: string;
};

type TimeSlot = {
  start: string;
  end: string;
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
    console.error('❌ Error fetching shop config:', error);
    return null;
  }

  if (!data) {
    console.error('❌ No shop config data returned');
    return null;
  }

  console.log('✅ Shop config loaded successfully:', data);
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

export function generateAvailableSlotsForBarber(args: {
  date: string;
  serviceDurationMinutes: number;
  shopConfig: ShopConfig;
  scheduleForDay: BarberScheduleDay | null;
  appointments: BarberAppointment[];
  timeOffBlocks: BarberTimeOff[];
  now?: Date;
  barberOverrides?: BarberOverrides | null;
}): TimeSlot[] {
  const {
    date,
    serviceDurationMinutes,
    shopConfig,
    scheduleForDay,
    appointments,
    timeOffBlocks,
    now = new Date(),
    barberOverrides = null,
  } = args;

  const SHOP_TIMEZONE = 'America/Chicago';
  const slots: TimeSlot[] = [];

  const minBookAheadHours = barberOverrides?.min_hours_before_booking_override ?? shopConfig.min_book_ahead_hours;
  const intervalMinutes = barberOverrides?.booking_interval_minutes_override ?? shopConfig.client_booking_interval_minutes;

  const selectedDate = dayjs.tz(date, SHOP_TIMEZONE);
  const todayInShop = dayjs.tz(now, SHOP_TIMEZONE);
  const daysUntilAppointment = selectedDate.diff(todayInShop.startOf('day'), 'day');

  if (daysUntilAppointment > shopConfig.days_bookable_in_advance) {
    return [];
  }

  if (!scheduleForDay || !scheduleForDay.active) {
    return [];
  }

  const [startHour, startMin] = scheduleForDay.start_time.split(':').map(Number);
  const [endHour, endMin] = scheduleForDay.end_time.split(':').map(Number);

  let currentSlot = selectedDate.hour(startHour).minute(startMin).second(0).millisecond(0);
  const dayEnd = selectedDate.hour(endHour).minute(endMin).second(0).millisecond(0);
  const lastPossibleStart = dayEnd.subtract(serviceDurationMinutes, 'minute');

  while (currentSlot.isBefore(lastPossibleStart) || currentSlot.isSame(lastPossibleStart)) {
    const slotStart = currentSlot;
    const slotEnd = slotStart.add(serviceDurationMinutes, 'minute');

    const nowWithBuffer = dayjs(now).add(minBookAheadHours, 'hour');
    if (slotStart.isBefore(nowWithBuffer)) {
      currentSlot = currentSlot.add(intervalMinutes, 'minute');
      continue;
    }

    const overlapsAppointment = appointments.some(appt => {
      if (appt.status === 'cancelled' || appt.status === 'no_show') {
        return false;
      }

      const apptStart = dayjs(appt.scheduled_start);
      const apptEnd = dayjs(appt.scheduled_end);

      return slotStart.isBefore(apptEnd) && slotEnd.isAfter(apptStart);
    });

    if (overlapsAppointment) {
      currentSlot = currentSlot.add(intervalMinutes, 'minute');
      continue;
    }

    const overlapsTimeOff = timeOffBlocks.some(block => {
      const blockStart = dayjs(block.start_time);
      const blockEnd = dayjs(block.end_time);

      return slotStart.isBefore(blockEnd) && slotEnd.isAfter(blockStart);
    });

    if (overlapsTimeOff) {
      currentSlot = currentSlot.add(intervalMinutes, 'minute');
      continue;
    }

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
    });

    currentSlot = currentSlot.add(intervalMinutes, 'minute');
  }

  return slots;
}
