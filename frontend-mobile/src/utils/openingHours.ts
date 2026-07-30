const DAY_INDEX: Record<string, number> = {
  Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6,
};

export type OpeningWindow = {
  openMinutes: number;
  closeMinutes: number;
};

export function canBookContinuousHours(
  startHour: number,
  duration: number,
  availableHours: Set<number>,
  openingWindows: OpeningWindow[] | null,
): boolean {
  const hasContinuousAvailability = Array.from({ length: duration }, (_, offset) => startHour + offset)
    .every(hour => availableHours.has(hour));
  if (!hasContinuousAvailability) return false;
  if (openingWindows === null) return true;
  const startMinutes = startHour * 60;
  const endMinutes = (startHour + duration) * 60;
  return openingWindows.some(window =>
    startMinutes >= window.openMinutes && endMinutes <= window.closeMinutes,
  );
}

function isOpenOnDate(daySpec: string, date: Date): boolean {
  const day = date.getDay();
  return daySpec.split(',').some(part => {
    const [start, end] = part.trim().split('-');
    const startDay = DAY_INDEX[start];
    const endDay = DAY_INDEX[end ?? start];
    if (startDay === undefined || endDay === undefined) return false;
    return startDay <= endDay
      ? day >= startDay && day <= endDay
      : day >= startDay || day <= endDay;
  });
}

function parseTimeRanges(value: string): OpeningWindow[] {
  const windows: OpeningWindow[] = [];
  const rangePattern = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
  let match: RegExpExecArray | null;
  while ((match = rangePattern.exec(value)) !== null) {
    const openMinutes = Number(match[1]) * 60 + Number(match[2]);
    let closeMinutes = Number(match[3]) * 60 + Number(match[4]);
    if (openMinutes > 1440 || closeMinutes > 1440) continue;
    if (closeMinutes <= openMinutes) closeMinutes += 1440;
    windows.push({ openMinutes, closeMinutes });
  }
  return windows;
}

/**
 * Parses the OSM-style opening-hour summaries returned by the API.
 * `null` means the format was not understood, while `[]` means the venue is
 * explicitly closed on the selected day.
 */
export function openingWindowsForDate(hours: string | null, date: Date): OpeningWindow[] | null {
  if (!hours) return null;
  const value = hours.trim();
  if (value === '24/7') return [{ openMinutes: 0, closeMinutes: 1440 }];

  const day = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
  const daySpecPattern = new RegExp(
    `(${day}(?:-${day})?(?:\\s*,\\s*${day}(?:-${day})?)*)\\s+`,
    'g',
  );
  const markers: Array<{ daySpec: string; contentStart: number; markerStart: number }> = [];
  let marker: RegExpExecArray | null;
  while ((marker = daySpecPattern.exec(value)) !== null) {
    markers.push({
      daySpec: marker[1],
      markerStart: marker.index,
      contentStart: marker.index + marker[0].length,
    });
  }

  if (markers.length === 0) {
    const allDayWindows = parseTimeRanges(value);
    return allDayWindows.length > 0 ? allDayWindows : null;
  }

  const windows: OpeningWindow[] = [];
  markers.forEach((item, index) => {
    if (!isOpenOnDate(item.daySpec, date)) return;
    const contentEnd = markers[index + 1]?.markerStart ?? value.length;
    windows.push(...parseTimeRanges(value.slice(item.contentStart, contentEnd)));
  });
  return windows;
}
