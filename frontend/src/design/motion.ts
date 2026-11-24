/** Motion tokens for `motion`, mirroring the CSS variables in tokens.css. */

export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_SETTLE = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  quick: 0.4,
  calm: 0.65,
  slow: 0.9,
} as const;
