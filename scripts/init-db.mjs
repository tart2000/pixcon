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
// Workflow: requested (just a name) → wip → ready → new (by publishing the kit) → validated (by the next publish).
// New and validated icons are public.
await sql`ALTER TABLE icons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'requested'`;
await sql`ALTER TABLE icons DROP CONSTRAINT IF EXISTS icons_status_check`;
await sql`ALTER TABLE icons ADD CONSTRAINT icons_status_check CHECK (status IN ('requested', 'wip', 'ready', 'new', 'validated'))`;
// Alternative names (tags) used by search, e.g. "love" for heart.
await sql`ALTER TABLE icons ADD COLUMN IF NOT EXISTS alts TEXT[] NOT NULL DEFAULT '{}'`;
// The name is the icon's slug: lowercase letters, digits and single dashes, unique.
await sql`CREATE UNIQUE INDEX IF NOT EXISTS icons_name_key ON icons (name)`;
await sql`ALTER TABLE icons DROP CONSTRAINT IF EXISTS icons_name_slug_check`;
await sql`ALTER TABLE icons ADD CONSTRAINT icons_name_slug_check CHECK (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`;
// How many times each icon was opened in the gallery popup.
await sql`ALTER TABLE icons ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0`;
// How many times each icon was downloaded as SVG (any style or variant).
await sql`ALTER TABLE icons ADD COLUMN IF NOT EXISTS downloads INTEGER NOT NULL DEFAULT 0`;
// Names the kit reads as modifiers (px-blob, px-fill…); keep in sync with src/lib/reserved.ts.
await sql`ALTER TABLE icons DROP CONSTRAINT IF EXISTS icons_name_reserved_check`;
await sql`ALTER TABLE icons ADD CONSTRAINT icons_name_reserved_check CHECK (name NOT IN (
  'pixel', 'rounded', 'blob', 'liquid', 'liquid-blob', 'retro', 'stitch', 'knit', 'dots', 'quirky', 'studs', 'mosaic', 'halftone', 'grainy', 'patchwork', 'gridded', 'regular', 'fill', 'xs', 'sm', 'lg', 'xl', '2x', '3x', 'spin', 'fw'
))`;
console.log("icons table ready");

// One row: what the live kit holds (written by production builds) and when a build was last asked for.
await sql`
  CREATE TABLE IF NOT EXISTS kit_state (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    built_hash TEXT,
    built_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ
  )
`;
await sql`INSERT INTO kit_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING`;
console.log("kit_state table ready");

// Bundle purchases: one row per paid Stripe Checkout. The token is the buyer's permanent download link.
await sql`
  CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Set once the email with the link went out, so it's sent exactly once.
    emailed_at TIMESTAMPTZ,
    downloads INTEGER NOT NULL DEFAULT 0,
    last_download_at TIMESTAMPTZ
  )
`;
console.log("purchases table ready");
