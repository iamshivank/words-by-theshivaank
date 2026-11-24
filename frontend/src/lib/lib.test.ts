import { describe, expect, it } from 'vitest';
import { cn } from './cn';
import { safeNext } from './safeNext';
import { formatClock, greetingFor } from './time';

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/desk/write/1?x=1')).toBe('/desk/write/1?x=1');
  });

  it('refuses other origins and junk', () => {
    expect(safeNext('https://evil.example')).toBe('/desk');
    expect(safeNext('//evil.example')).toBe('/desk');
    expect(safeNext('/\\evil.example')).toBe('/desk');
    expect(safeNext(null)).toBe('/desk');
  });
});

describe('time', () => {
  it('reads the clock in Bengaluru time', () => {
    // 15:30 UTC is 21:00 in Bengaluru (UTC+5:30).
    const date = new Date('2026-11-24T15:30:00Z');
    expect(formatClock(date)).toBe('21:00');
    expect(greetingFor(date)).toBe('Good evening');
  });

  it('greets night owls', () => {
    expect(greetingFor(new Date('2026-11-24T21:00:00Z'))).toBe('Still up'); // 02:30 IST
  });
});

describe('cn', () => {
  it('lets later utilities override earlier ones without mixing up size and color', () => {
    expect(cn('h-hair w-full bg-accent', 'w-12')).toBe('h-hair bg-accent w-12');
    expect(cn('text-meta text-muted', 'text-ink')).toBe('text-meta text-ink');
    expect(cn('text-h4', 'text-h1')).toBe('text-h1');
  });
});
