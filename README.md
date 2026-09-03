# The Global Academy — headless rebuild

A working rebuild of [theglobalacademy.ac](https://theglobalacademy.ac) as a single
Next.js app: **Payload CMS 3 + Postgres** as the backend/admin panel, and a real
public frontend (home page, login, self-service registration, and a researcher
dashboard) served from the same app and domain — no separate static site or
cross-origin API calls.

Content has been fully migrated from the live WordPress site (see "Migrating
content" below), and the database now runs on **Supabase** (see "Database:
Supabase" below) rather than a local/native Postgres install.

## Stack

- **Payload CMS 3.88** — admin UI, auth, REST + GraphQL, access control
- **Postgres via Supabase** (via `@payloadcms/db-postgres` / Drizzle) — not Payload's default Mongo
- **Next.js 16** (App Router) — Payload 3 runs embedded inside a Next.js app; the
  public frontend (`src/app/(frontend)/`) is regular Next.js pages in the same app
- **Stripe** (`@payloadcms/plugin-stripe` + the `stripe` SDK) — paid job listings

## The public frontend

Everything under `src/app/(frontend)/`:

- **`/`** — home page (hero, new researchers, latest jobs, recent articles),
  server-rendered directly from Payload's local API (no client-side fetch,
  no CORS — same app, same origin).
- **`/register`** — public self-registration. Creates a `users` account
  (always `role: researcher` — see `collections/Users.ts`, only an admin can
  set any other role), an empty unpublished `researchers` profile linked to
  it, logs the new user in, and redirects to `/dashboard`. Backed by a small
  custom endpoint, `src/app/api/auth/register/route.ts`, that does all three
  in one request.
- **`/login`** / logout — Payload's own built-in `/api/users/login` and
  `/api/users/logout` REST endpoints; no custom auth code needed there.
- **`/dashboard`** — for a `researcher`, a self-service edit form for their
  own profile (name, position, institution, country, research focus, social
  links, publish toggle), covering the most commonly-edited fields rather
  than the full ~30-field schema (everything else stays editable in
  `/admin`). For an `admin`, a short note pointing to the full `/admin`
  panel instead of a profile form.

Role-based access control (who can read/edit what) lives in the collections
themselves (`collections/Users.ts`, `collections/Researchers.ts`) via
Payload's `access` config, not in the frontend — the frontend pages just call
the same REST endpoints anyone else would, so the rules are enforced
server-side regardless of which client calls them.

## Database: Supabase

`DATABASE_URL` in `.env` points at a Supabase Postgres project via its
**Session Pooler** connection string (not the direct-connection host, which
can fail to resolve — `getaddrinfo failed` — on networks without IPv6). Get
it from the Supabase dashboard's **Connect** button → **Session pooler** tab;
the format is:

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=no-verify
```

Two things worth knowing if you ever rebuild this connection string by hand:
the username needs the `.{project-ref}` suffix (pooler-specific, unlike the
direct-connection form), and `?sslmode=no-verify` is needed for Node's `pg`
client to connect (Supabase requires SSL; `no-verify` skips certificate-chain
validation, which is the standard way to connect from Node here). Also make
sure `pg_trgm` and `citext` are enabled under **Database → Extensions** in
the Supabase dashboard — the schema uses both.

## Migrating content from the old WordPress site

This project includes a full migration of the real content from
`theglobalacademy.ac`'s WordPress database (a phpMyAdmin SQL export) into
Payload/Postgres — already run once and verified; the extracted JSON ships
in `migration/extracted/` so **you don't need MySQL or the original SQL
dump to use it**.

```bash
npm run seed       # SDG goals/targets — the migration links to these
npm run migrate     # reads migration/extracted/*.json, creates everything in Payload
```

It's idempotent — re-running it updates existing records (matched by slug)
rather than creating duplicates, so it's safe to run again after pulling
schema changes.

What it brings in, from the real site:

- **575 institutions** (from the WordPress `institutions` taxonomy)
- **807 researcher profiles** (702 published) — name, position, institution,
  country, languages, research focus, SDG goal/target tags, projects, PhD
  supervision details, social links, and more. 21 raw WordPress entries were
  duplicate form (re-)submissions of the same profile and were collapsed
  into one, keeping the most recent submission — see
  `migration/extract.py` for the exact rule.
- **1 fully-modeled research group** ("Low Harm Hedonism") with its 13
  linked researchers, 8 SDG goals, and full "current research" breakdown —
  the WordPress site only ever had one Research Group page built out this
  way; most researchers instead carry a free-text group name/URL directly
  on their own profile (`researchGroupName` / `researchGroupUrl`), which
  migrates too.
- **144 job listings** (all draft/expired in the source — the live site's
  queue happens to be empty right now) with salary, location, sector,
  faculty role, and SDG goal tagging
- **62 blog posts** across 9 categories

### Images — deliberately deferred

Every image field on Researchers/Institutions/ResearchGroups has a matching
`*SourceUrl` text field (e.g. `photoSourceUrl`) holding the original
`theglobalacademy.ac/wp-content/uploads/...` URL, populated for **804
researcher photos** and a handful of institution/group logos. The real
Payload `upload` field (`photo`, `logo`, etc.) is left empty. A follow-up
pass can download each `*SourceUrl` and upload it via Payload's Media
collection — deliberately kept as a separate step so the (much faster,
much cheaper) data migration wasn't blocked on ~800 image downloads.

### Re-running the extraction against a fresher export

If you get a newer SQL export later and want to re-extract:

```bash
# 1. Import the .sql export into a local MySQL/MariaDB database
# 2. pip install pymysql
python3 migration/extract.py --db <your_db_name> --user <user> --password <password> --out migration/extracted
npm run migrate
```

`migration/extract.py` has extensive comments on the WordPress field
mapping it relies on (ACF field names, WP Job Manager's underscore-prefixed
fields, the PHP-serialized SDG goal/target arrays) — worth a read before
trusting it against a differently-shaped export.

### Known source-data quirks worth knowing about

- `phdCompletionDate` is free text in the source, not a real date (values
  are things like `"2024"` or the literal `"phd-completed"`).
- The `location`/`groupMap` fields (an ACF Google Map field) are populated
  on only a couple of records total and the 2 non-empty values found don't
  look like real coordinates — kept as raw text, not modeled as a geo field.
- Job listings' `sector` (academic subject) and `sdgGoals` are two
  genuinely different taxonomies in the source that are easy to conflate —
  `job_listing_category` is actually used for SDG goal tagging on this
  site, not a generic job category.

## Setup

```bash
cp .env.example .env      # then fill in DATABASE_URL (see "Database: Supabase" above)
                           # and a real PAYLOAD_SECRET
npm install
npm run dev               # boots Next.js + Payload, pushes the schema to Postgres
```

Visit `http://localhost:3000/admin` to create the first admin user, or
register the first user over REST:

```bash
curl -X POST http://localhost:3000/api/users/first-register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"...","role":"admin"}'
```

The public frontend at `http://localhost:3000/` is live as soon as `npm run
dev` is running — `/register` for a new researcher account, `/login` /
`/dashboard` after that.

## Deploying (GitHub + Vercel)

1. Push this project to a GitHub repo (the working tree is already set up
   with a `.gitignore` that excludes `.env`, `node_modules`, `.next`, and
   `/media` — nothing secret gets committed).
2. In [Vercel](https://vercel.com), **Add New → Project**, import that GitHub
   repo. Vercel auto-detects Next.js — no build config changes needed.
3. Before the first deploy, add these under **Environment Variables**:
   - `DATABASE_URL` — the same Supabase pooler connection string from `.env`
   - `PAYLOAD_SECRET` — the same value from `.env`
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — only if/when the paid
     job-listing flow is wired up; safe to leave blank until then
4. Deploy. Every push to the connected branch redeploys automatically.
5. To use a custom domain (e.g. `theglobalacademy.com`), add it under the
   Vercel project's **Settings → Domains**, then update the DNS records at
   your domain registrar as Vercel's dashboard instructs (typically an `A`
   record for the bare domain and a `CNAME` for `www`, pointing at Vercel
   instead of wherever the domain currently resolves).

## What's here

```
db/schema.sql              Plain Postgres DDL — the CMS-agnostic reference
                            schema, in case you ever move off Payload. Verified
                            to apply cleanly and support every join used below.
src/payload.config.ts      Postgres adapter + all collections + Stripe plugin
src/collections/           Researchers, Institutions, ResearchGroups,
                            SDGGoals, SDGTargets, Jobs, PricingTiers, Posts,
                            PostCategories, TeamMembers, Pages, Users, Media
src/seed/sdgs.ts           The 17 UN SDGs + all ~169 official targets,
                            transcribed from the live site's own
                            "Goals and targets" page
src/seed/index.ts          Idempotent seed runner (npm run seed)
src/plugins/stripe.ts      Stripe plugin config: syncs pricing-tiers to
                            Stripe Products, handles checkout.session.completed
src/endpoints/createJobCheckout.ts
                            POST /api/jobs/:id/checkout — starts a Stripe
                            Checkout Session for one job listing
migration/extract.py       Extracts the old WordPress MySQL export into
                            clean JSON (see "Migrating content" above)
migration/migrate.mjs      Reads that JSON and creates everything in
                            Payload via the local API — npm run migrate
migration/extracted/       The already-extracted real content from
                            theglobalacademy.ac — used by npm run migrate
```

### Why these collections

Modeled directly on what the live site does, not a generic guess:

- **Researchers** — public directory with search-by-name, country filter,
  and SDG-goal filter on the live site. `access.read` mirrors that (public
  sees only `isPublished` profiles); `access.update` is scoped so a
  researcher can only edit the profile linked to their own `user` account
  (matches the "contact the team to update your profile" note on live
  profiles, except here it's self-service).
- **SDGGoals / SDGTargets** — the live site's "Goals and targets" page is a
  full accordion of all 17 goals and every official UN target (150+ of
  them). That's static reference data, not editorial content, so it's
  seeded once (`npm run seed`) rather than built as an admin-managed
  collection you'd populate by hand.
- **Jobs / PricingTiers** — the live jobs board (WP Job Manager-style: search,
  location, remote toggle, job-type filters, RSS) plus its paid-listing tier
  ("Products and Pricing" on the live site). `Jobs.isPublished` only flips
  true once a listing is paid — see the Stripe section below.
- **Users** has a `role` field (`admin` / `researcher` / `employer`) because
  the live site has three effective actor types sharing one login/register/
  reset-password flow.

## Stripe / paid job listings

1. Create Products/Prices in your Stripe dashboard (test mode), or let the
   sync push them: creating a `pricing-tiers` doc calls the Stripe API
   immediately via `@payloadcms/plugin-stripe`'s create hook — **this
   requires a real `STRIPE_SECRET_KEY`** (test key is fine); without one,
   creating a pricing tier will fail with a 500, which is expected, not a bug.
2. Set `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` in `.env`.
3. `POST /api/jobs/:id/checkout` with `{ "priceTierId": "..." }` creates a
   Checkout Session and returns `{ checkoutUrl }` for the frontend to
   redirect to.
4. On completion, Stripe calls `POST /api/stripe/webhooks` (auto-registered
   by the plugin); `checkout.session.completed` marks the job
   `paymentStatus: 'paid'`, `isPublished: true`.
5. Test locally with the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhooks
   stripe trigger checkout.session.completed
   ```

## What's been verified

Actually run, not assumed, in this environment:

- `db/schema.sql` applies cleanly to Postgres 16; inserted and joined rows
  across every relationship (researcher ↔ institution ↔ SDG target ↔ jobs)
- `npm install` completes with the pinned versions above
- `npm run generate:types` compiles every collection with no errors
- `npm run dev` boots, pushes schema to Postgres, and serves `/admin`
- Full REST round-trip: created a user, an institution, an SDG goal/target,
  and a researcher linking all three; confirmed relationships resolve on
  read (`?depth=2`)
- Access control: anonymous `POST /api/researchers` → `403`; an
  `isPublished: false` researcher is invisible to an anonymous
  `GET /api/researchers`, visible to an authenticated one
- `npm run seed` populated all 17 goals and 168 targets, target counts per
  goal matching what's on the live site (e.g. Goal 17 → 19 targets, Goal 7 → 5)
- The Stripe checkout endpoint resolves and fails exactly where expected
  (missing `STRIPE_SECRET_KEY`) rather than 404ing — routing is correct
- **The full WordPress migration** — `npm run seed && npm run migrate`
  against a real export of `theglobalacademy.ac`'s database: 575
  institutions, 807 researcher profiles (702 published, matching the
  source), 1 research group with all 13 linked researchers and 8 SDG
  goals, 144 job listings, 62 blog posts across 9 categories. Spot-checked
  end-to-end over REST (`?depth=2`) against a known real profile (Xiaoxiao
  Qian) — institution, SDG target, and goal relationships all resolve
  correctly, matching what's shown on her live profile page. Confirmed
  idempotent by running it twice back-to-back with identical row counts.

## What's deliberately not here yet

- **Researcher/institution photos and logos** — captured as source URLs
  during the migration (see "Images — deliberately deferred" above) but not
  downloaded or attached yet.
- **Employer-side job submission/payment UI** — the API and Stripe plugin
  support it; no frontend forms built yet (researcher registration and the
  researcher dashboard are built — see "The public frontend" above).
- **Full-fidelity dashboard editing** — the `/dashboard` profile form covers
  the most commonly-edited fields; less common fields (PhD supervision,
  additional job titles/organisations, `otherSocialLinks`, etc.) are still
  admin-only via `/admin` for now.
- **Automated tests** beyond the one placeholder integration spec in
  `tests/int/` — worth building out once collections stabilize.
