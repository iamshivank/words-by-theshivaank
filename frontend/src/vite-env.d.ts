/// <reference types="vite/client" />

// Interface (not type) so it merges with Vite's own ImportMetaEnv.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ImportMetaEnv {
  /** Origin of the API when it is not served from the same origin (production split deploys). */
  readonly VITE_API_URL?: string;
}
