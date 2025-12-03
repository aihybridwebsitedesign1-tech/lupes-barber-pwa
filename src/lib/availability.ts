import { supabase } from './supabase';

export type TimeSlot = {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
};

type ShopHours = {
  open: string;
  close: string;
} | null;


function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function generateSlots(
  startMinutes: number,
  endMinutes: number,
  durationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let currentMinutes = startMinutes;

  while (currentMinutes + durationMinutes <= endMinutes) {
    slots.push({
      start: minutesToTime(currentMinutes),
      end: minutesToTime(currentMinutes + durationMinutes),
    });
    currentMinutes += durationMinutes;
  }

  return slots;
}

function overlaps(
  slot: TimeSlot,
  busyStart: string,
  busyEnd: string
): boolean {
  const slotStart = timeToMinutes(slot.start);
  const slotEnd = timeToMinutes(slot.end);
  const busyStartMin = timeToMinutes(busyStart);
  const busyEndMin = timeToMinutes(busyEnd);

  return slotStart < busyEndMin && slotEnd > busyStartMin;
}

export async function getAvailableTimeSlots(
  date: string,
  serviceDurationMinutes: number,
  barberId: string
): Promise<TimeSlot[]> {
  try {
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    const { data: shopConfig } = await supabase
      .from('shop_config')
      .select('shop_hours')
      .single();

    if (!shopConfig?.shop_hours) {
      return [];
    }

    const shopHours = shopConfig.shop_hours[String(dayOfWeek)] as ShopHours;
    if (!shopHours) {
      return [];
    }

    const { data: barberSchedule } = await supabase
      .from('barber_schedules')
      .select('*')
      .eq('barber_id', barberId)
      .eq('day_of_week', dayOfWeek)
      .eq('active', true)
      .maybeSingle();

    if (!barberSchedule) {
      return [];
    }

    const workStart = Math.max(
      timeToMinutes(shopHours.open),
      timeToMinutes(barberSchedule.start_time)
    );
    const workEnd = Math.min(
      timeToMinutes(shopHours.close),
      timeToMinutes(barberSchedule.end_time)
    );

    if (workStart >= workEnd) {
      return [];
    }

    const { data: timeOff } = await supabase
      .from('barber_time_off')
      .select('*')
      .eq('barber_id', barberId)
      .eq('date', date);

    if (timeOff && timeOff.length > 0) {
      const fullDayOff = timeOff.some(
        (to) => !to.start_time || !to.end_time
      );
      if (fullDayOff) {
        return [];
      }
    }

    const dateStart = new Date(date + 'T00:00:00').toISOString();
    const dateEnd = new Date(date + 'T23:59:59').toISOString();

    const { data: appointments } = await supabase
      .from('appointments')
      .select('scheduled_start, scheduled_end')
      .eq('barber_id', barberId)
      .gte('scheduled_start', dateStart)
      .lte('scheduled_start', dateEnd)
      .not('status', 'in', '(cancelled,no_show)');

    let allSlots = generateSlots(workStart, workEnd, serviceDurationMinutes);

    if (appointments && appointments.length > 0) {
      allSlots = allSlots.filter((slot) => {
        return !appointments.some((apt) => {
          const aptStart = new Date(apt.scheduled_start);
          const aptEnd = new Date(apt.scheduled_end);
          const aptStartTime = `${String(aptStart.getHours()).padStart(2, '0')}:${String(aptStart.getMinutes()).padStart(2, '0')}`;
          const aptEndTime = `${String(aptEnd.getHours()).padStart(2, '0')}:${String(aptEnd.getMinutes()).padStart(2, '0')}`;
          return overlaps(slot, aptStartTime, aptEndTime);
        });
      });
    }

    if (timeOff && timeOff.length > 0) {
      allSlots = allSlots.filter((slot) => {
        return !timeOff.some((to) => {
          if (!to.start_time || !to.end_time) return false;
          return overlaps(slot, to.start_time, to.end_time);
        });
      });
    }

    return allSlots;
  } catch (error) {
    console.error('Error calculating available slots:', error);
    return [];
  }
}

export async function isBarberAvailableForAppointment(
  barberId: string,
  appointmentId: string
): Promise<boolean> {
  try {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('scheduled_start, scheduled_end, service_id')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      return false;
    }

    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', appointment.service_id)
      .single();

    if (!service) {
      return false;
    }

    const startDate = new Date(appointment.scheduled_start);
    const dateStr = startDate.toISOString().split('T')[0];
    const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

    const availableSlots = await getAvailableTimeSlots(
      dateStr,
      service.duration_minutes,
      barberId
    );

    return availableSlots.some((slot) => slot.start === startTime);
  } catch (error) {
    console.error('Error checking barber availability:', error);
    return false;
  }
}
