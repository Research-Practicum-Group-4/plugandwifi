import { canBookContinuousHours, openingWindowsForDate } from '../src/utils/openingHours';

const monday = new Date(2026, 6, 27, 12);
const sunday = new Date(2026, 7, 2, 12);

describe('openingWindowsForDate', () => {
  it('preserves half-hour opening and closing boundaries', () => {
    expect(openingWindowsForDate('Mo-Fr 11:30-22:45', monday)).toEqual([
      { openMinutes: 690, closeMinutes: 1365 },
    ]);
  });

  it('handles spaced day lists', () => {
    expect(openingWindowsForDate('Mo-Th, Su 06:30-00:00; Fr, Sa 06:30-01:00', sunday)).toEqual([
      { openMinutes: 390, closeMinutes: 1440 },
    ]);
  });

  it('handles comma-separated schedules', () => {
    expect(openingWindowsForDate('Mo-Th 06:00-17:00, Fr-Su 06:00-20:00', sunday)).toEqual([
      { openMinutes: 360, closeMinutes: 1200 },
    ]);
  });

  it('keeps split service periods separate', () => {
    expect(openingWindowsForDate('Mo-Fr 11:30-14:30, 17:30-22:30', monday)).toEqual([
      { openMinutes: 690, closeMinutes: 870 },
      { openMinutes: 1050, closeMinutes: 1350 },
    ]);
  });

  it('returns no windows on a day without opening hours', () => {
    expect(openingWindowsForDate('Mo-Fr 09:00-17:00', sunday)).toEqual([]);
  });

  it('requires every hourly slot in a multi-hour booking', () => {
    expect(canBookContinuousHours(12, 3, new Set([12, 13, 14]), null)).toBe(true);
    expect(canBookContinuousHours(12, 3, new Set([12, 14]), null)).toBe(false);
  });

  it('does not cross a split-service closure', () => {
    const windows = openingWindowsForDate('Mo-Fr 11:30-14:30, 17:30-22:30', monday);
    expect(canBookContinuousHours(13, 2, new Set([13, 14]), windows)).toBe(false);
  });
});
