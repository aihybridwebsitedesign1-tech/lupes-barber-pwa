import dayjs from 'dayjs';

export function formatTime12h(iso: string | Date): string {
  return dayjs(iso).format('h:mm A');
}

export function formatDateLong(iso: string | Date): string {
  return dayjs(iso).format('dddd, MMMM D, YYYY');
}

export function formatDateShort(iso: string | Date): string {
  return dayjs(iso).format('MMM D, YYYY');
}

export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}
