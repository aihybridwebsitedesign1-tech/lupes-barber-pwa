export type TimeEntryType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end';

export type TimeEntry = {
  id: string;
  barber_id: string;
  entry_type: TimeEntryType;
  timestamp: string;
  note?: string | null;
};

export type ShiftStatus = 'complete' | 'in_progress' | 'incomplete' | 'on_break';

export type DailyShift = {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breaks: { start: string; end: string | null }[];
  totalWorkedMs: number;
  breakTimeMs: number;
  netWorkedMs: number;
  status: ShiftStatus;
  entries: TimeEntry[];
};

export type DailySummary = {
  barberId: string;
  barberName: string;
  date: string;
  shift: DailyShift;
  totalHours: number;
  breakHours: number;
  netHours: number;
  entryCount: number;
  hasIssues: boolean;
  issueDescription?: string;
};

export function parseShiftsForDay(entries: TimeEntry[]): DailyShift {
  if (entries.length === 0) {
    return {
      date: '',
      clockIn: null,
      clockOut: null,
      breaks: [],
      totalWorkedMs: 0,
      breakTimeMs: 0,
      netWorkedMs: 0,
      status: 'incomplete',
      entries: [],
    };
  }

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const date = sortedEntries[0].timestamp.split('T')[0];

  let clockIn: string | null = null;
  let clockOut: string | null = null;
  const breaks: { start: string; end: string | null }[] = [];
  let currentBreakStart: string | null = null;

  for (const entry of sortedEntries) {
    if (entry.entry_type === 'clock_in') {
      if (!clockIn) {
        clockIn = entry.timestamp;
      }
    } else if (entry.entry_type === 'clock_out') {
      clockOut = entry.timestamp;
    } else if (entry.entry_type === 'break_start') {
      if (currentBreakStart === null) {
        currentBreakStart = entry.timestamp;
      }
    } else if (entry.entry_type === 'break_end') {
      if (currentBreakStart) {
        breaks.push({ start: currentBreakStart, end: entry.timestamp });
        currentBreakStart = null;
      }
    }
  }

  if (currentBreakStart !== null) {
    breaks.push({ start: currentBreakStart, end: null });
  }

  let totalWorkedMs = 0;
  let breakTimeMs = 0;

  if (clockIn) {
    const endTime = clockOut ? new Date(clockOut).getTime() : Date.now();
    const startTime = new Date(clockIn).getTime();
    totalWorkedMs = endTime - startTime;
  }

  for (const brk of breaks) {
    const breakStart = new Date(brk.start).getTime();
    const breakEnd = brk.end ? new Date(brk.end).getTime() : Date.now();
    breakTimeMs += breakEnd - breakStart;
  }

  const netWorkedMs = Math.max(0, totalWorkedMs - breakTimeMs);

  let status: ShiftStatus = 'incomplete';
  if (clockIn && clockOut) {
    status = 'complete';
  } else if (clockIn && !clockOut) {
    if (currentBreakStart !== null) {
      status = 'on_break';
    } else {
      status = 'in_progress';
    }
  }

  return {
    date,
    clockIn,
    clockOut,
    breaks,
    totalWorkedMs,
    breakTimeMs,
    netWorkedMs,
    status,
    entries: sortedEntries,
  };
}

export function groupEntriesByBarberAndDate(entries: TimeEntry[]): Map<string, Map<string, TimeEntry[]>> {
  const grouped = new Map<string, Map<string, TimeEntry[]>>();

  for (const entry of entries) {
    const date = entry.timestamp.split('T')[0];

    if (!grouped.has(entry.barber_id)) {
      grouped.set(entry.barber_id, new Map());
    }

    const barberMap = grouped.get(entry.barber_id)!;

    if (!barberMap.has(date)) {
      barberMap.set(date, []);
    }

    barberMap.get(date)!.push(entry);
  }

  return grouped;
}

export function calculateDailySummaries(
  entries: TimeEntry[],
  barberNames: Map<string, string>
): DailySummary[] {
  const grouped = groupEntriesByBarberAndDate(entries);
  const summaries: DailySummary[] = [];

  grouped.forEach((dateMap, barberId) => {
    dateMap.forEach((dayEntries, date) => {
      const shift = parseShiftsForDay(dayEntries);

      const totalHours = shift.totalWorkedMs / (1000 * 60 * 60);
      const breakHours = shift.breakTimeMs / (1000 * 60 * 60);
      const netHours = shift.netWorkedMs / (1000 * 60 * 60);

      let hasIssues = false;
      let issueDescription: string | undefined;

      if (shift.status === 'incomplete') {
        hasIssues = true;
        issueDescription = 'Missing clock-in or clock-out';
      } else if (shift.breaks.some(b => b.end === null)) {
        hasIssues = true;
        issueDescription = 'Break not ended';
      } else if (shift.status === 'in_progress') {
        hasIssues = true;
        issueDescription = 'Shift in progress';
      } else if (shift.status === 'on_break') {
        hasIssues = true;
        issueDescription = 'Currently on break';
      }

      summaries.push({
        barberId,
        barberName: barberNames.get(barberId) || 'Unknown',
        date,
        shift,
        totalHours,
        breakHours,
        netHours,
        entryCount: dayEntries.length,
        hasIssues,
        issueDescription,
      });
    });
  });

  return summaries.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return a.barberName.localeCompare(b.barberName);
  });
}

export function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function validateClockAction(
  currentEntries: TimeEntry[],
  actionType: TimeEntryType
): { valid: boolean; reason?: string } {
  if (currentEntries.length === 0) {
    if (actionType === 'clock_in') {
      return { valid: true };
    }
    return { valid: false, reason: 'Must clock in first' };
  }

  const lastEntry = currentEntries[currentEntries.length - 1];

  switch (actionType) {
    case 'clock_in':
      if (lastEntry.entry_type === 'clock_out') {
        return { valid: true };
      }
      return { valid: false, reason: 'Already clocked in' };

    case 'clock_out':
      if (lastEntry.entry_type === 'clock_in' || lastEntry.entry_type === 'break_end') {
        return { valid: true };
      }
      if (lastEntry.entry_type === 'break_start') {
        return { valid: false, reason: 'Must end break before clocking out' };
      }
      return { valid: false, reason: 'Not clocked in' };

    case 'break_start':
      if (lastEntry.entry_type === 'clock_in' || lastEntry.entry_type === 'break_end') {
        return { valid: true };
      }
      return { valid: false, reason: 'Must clock in first or end current break' };

    case 'break_end':
      if (lastEntry.entry_type === 'break_start') {
        return { valid: true };
      }
      return { valid: false, reason: 'No break to end' };

    default:
      return { valid: false, reason: 'Invalid action type' };
  }
}
