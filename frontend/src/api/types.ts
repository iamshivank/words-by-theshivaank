/**
 * Friendly names for the generated OpenAPI types.
 * Regenerate schema.d.ts with `npm run api:types` (running backend) or `npm run api:types:offline`.
 */
import type { components } from './schema';

type Schemas = components['schemas'];

export type Me = Schemas['Me'];
export type LoginRequest = Schemas['LoginRequest'];
export type PublicSettings = Schemas['PublicSettings'];
export type Appearance = Schemas['Appearance'];
