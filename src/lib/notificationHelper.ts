/**
 * Helper functions for sending appointment notifications
 * (confirmations, reminders, cancellations, reschedules)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface AppointmentDetails {
  shopName: string;
  date: string;
  time: string;
  barberName: string;
  serviceName: string;
  shopPhone?: string;
}

interface SendNotificationParams {
  appointmentId: string;
  clientId: string;
  phoneNumber: string;
  notificationType: 'confirmation' | 'reminder' | 'cancellation' | 'reschedule';
  appointmentDetails: AppointmentDetails;
  language: 'en' | 'es';
}

/**
 * Format date to readable string
 */
export function formatAppointmentDate(dateStr: string, language: 'en' | 'es'): string {
  const date = new Date(dateStr);
  const days = language === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = language === 'es'
    ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();

  return `${dayName}, ${monthName} ${dayNum}`;
}

/**
 * Format time to readable string (12-hour format)
 */
export function formatAppointmentTime(dateStr: string): string {
  const date = new Date(dateStr);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString();
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Send appointment notification via edge function
 * Does not throw errors - returns status instead
 */
export async function sendAppointmentNotification(
  params: SendNotificationParams
): Promise<{ success: boolean; status: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (result.status === 'sent') {
      return { success: true, status: 'sent' };
    } else if (result.status === 'disabled') {
      // SMS not configured, but don't treat as error
      return { success: true, status: 'disabled' };
    } else {
      return { success: false, status: 'error', error: result.message };
    }
  } catch (error) {
    console.error('[Notification] Failed to send:', error);
    return { success: false, status: 'error', error: 'Network error' };
  }
}

/**
 * Send confirmation notification (helper wrapper)
 */
export async function sendConfirmation(params: {
  appointmentId: string;
  clientId: string;
  phoneNumber: string;
  scheduledStart: string;
  barberName: string;
  serviceName: string;
  shopName: string;
  shopPhone?: string;
  language: 'en' | 'es';
}) {
  return sendAppointmentNotification({
    appointmentId: params.appointmentId,
    clientId: params.clientId,
    phoneNumber: params.phoneNumber,
    notificationType: 'confirmation',
    appointmentDetails: {
      shopName: params.shopName,
      date: formatAppointmentDate(params.scheduledStart, params.language),
      time: formatAppointmentTime(params.scheduledStart),
      barberName: params.barberName,
      serviceName: params.serviceName,
      shopPhone: params.shopPhone,
    },
    language: params.language,
  });
}

/**
 * Send cancellation notification
 */
export async function sendCancellation(params: {
  appointmentId: string;
  clientId: string;
  phoneNumber: string;
  scheduledStart: string;
  shopName: string;
  shopPhone?: string;
  language: 'en' | 'es';
}) {
  return sendAppointmentNotification({
    appointmentId: params.appointmentId,
    clientId: params.clientId,
    phoneNumber: params.phoneNumber,
    notificationType: 'cancellation',
    appointmentDetails: {
      shopName: params.shopName,
      date: formatAppointmentDate(params.scheduledStart, params.language),
      time: formatAppointmentTime(params.scheduledStart),
      barberName: '',
      serviceName: '',
      shopPhone: params.shopPhone,
    },
    language: params.language,
  });
}

/**
 * Send reschedule notification
 */
export async function sendReschedule(params: {
  appointmentId: string;
  clientId: string;
  phoneNumber: string;
  newScheduledStart: string;
  barberName: string;
  shopName: string;
  shopPhone?: string;
  language: 'en' | 'es';
}) {
  return sendAppointmentNotification({
    appointmentId: params.appointmentId,
    clientId: params.clientId,
    phoneNumber: params.phoneNumber,
    notificationType: 'reschedule',
    appointmentDetails: {
      shopName: params.shopName,
      date: formatAppointmentDate(params.newScheduledStart, params.language),
      time: formatAppointmentTime(params.newScheduledStart),
      barberName: params.barberName,
      serviceName: '',
      shopPhone: params.shopPhone,
    },
    language: params.language,
  });
}
