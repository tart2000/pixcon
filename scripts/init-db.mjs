import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS icons (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    pixels CHAR(121) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
// Each icon has a "regular" drawing and an optional "fill" variant.
await sql`ALTER TABLE icons ADD COLUMN IF NOT EXISTS pixels_fill CHAR(121)`;
// Workflow: requested (just a name) → wip → validated. Only validated icons are public.
await sql`ALTER TABLE icons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'requested'`;
await sql`ALTER TABLE icons DROP CONSTRAINT IF EXISTS icons_status_check`;
await sql`ALTER TABLE icons ADD CONSTRAINT icons_status_check CHECK (status IN ('requested', 'wip', 'validated'))`;
// Alternative names (tags) used by search, e.g. "love" for heart.
await sql`ALTER TABLE icons ADD COLUMN IF NOT EXISTS alts TEXT[] NOT NULL DEFAULT '{}'`;
// The name is the icon's slug: lowercase letters, digits and single dashes, unique.
await sql`CREATE UNIQUE INDEX IF NOT EXISTS icons_name_key ON icons (name)`;
await sql`ALTER TABLE icons DROP CONSTRAINT IF EXISTS icons_name_slug_check`;
await sql`ALTER TABLE icons ADD CONSTRAINT icons_name_slug_check CHECK (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`;
// Names the kit reads as modifiers (px-blob, px-fill…); keep in sync with src/lib/reserved.ts.
await sql`ALTER TABLE icons DROP CONSTRAINT IF EXISTS icons_name_reserved_check`;
await sql`ALTER TABLE icons ADD CONSTRAINT icons_name_reserved_check CHECK (name NOT IN (
  'pixel', 'rounded', 'blob', 'liquid', 'liquid-blob', 'retro', 'regular', 'fill', 'xs', 'sm', 'lg', 'xl', '2x', '3x', 'spin', 'fw'
))`;
console.log("icons table ready");
