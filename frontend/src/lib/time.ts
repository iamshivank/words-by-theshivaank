import { useEffect, useState } from 'react';

export const HOME_TIME_ZONE = 'Asia/Kolkata';
export const HOME_CITY = 'Bengaluru';

const longDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: HOME_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: HOME_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const hourOnly = new Intl.DateTimeFormat('en-GB', {
  timeZone: HOME_TIME_ZONE,
  hour: 'numeric',
  hourCycle: 'h23',
});

/** "Tuesday, 24 November 2026" in Bengaluru time. */
export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

/** "21:07" in Bengaluru time. */
export function formatClock(date: Date): string {
  return clock.format(date);
}

export function greetingFor(date: Date): string {
  const hour = Number(hourOnly.format(date));
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

/** Current time, refreshed on the next whole interval boundary so a minute clock flips on the minute. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setNow(new Date());
          schedule();
        },
        intervalMs - (Date.now() % intervalMs),
      );
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
    };
  }, [intervalMs]);
  return now;
}
