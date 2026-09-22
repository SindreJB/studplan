# Studplan

TanStack Start on Cloudflare Workers with D1, Better Auth, and Wrangler.

## First-time setup

```sh
cp .env.local.example .env.local
cp .env.prod.example .env.prod
vp run db:generate
pnpm --filter @repo/web exec wrangler login
pnpm --filter @repo/web exec wrangler d1 create studplan --binding DB --update-config --config ../../wrangler.jsonc
vp run db:migrate:remote
```

`wrangler d1 create --update-config` writes the new database ID to the root
`wrangler.jsonc`.

## Local development

```sh
vp run db:migrate:local
vp run dev
```

The Cloudflare Vite plugin loads root `.env.local` through the root Wrangler configuration.

## Deploy

Put production secrets in the ignored root `.env.prod`:

```dotenv
BETTER_AUTH_SECRET=...
```

Then deploy:

```sh
vp run deploy
```

Deployment builds the app, applies remote D1 migrations, uploads `.env.prod` with
`wrangler secret bulk`, and deploys the Worker.

The Worker is attached to `studplan.no` as a Cloudflare-managed custom domain, and
`vars.APP_URL` in `wrangler.jsonc` matches it. The zone must be Active in Cloudflare
before the first deploy; while its nameservers are still propagating, comment out the
`routes` block to deploy on the `workers.dev` subdomain instead and set `APP_URL` to
that address, or sign-in cookies and password-reset links point at the wrong host.

Password-reset mail goes out through the `EMAIL` binding, which needs Cloudflare Email
Routing enabled on `studplan.no`. It cannot send from a `workers.dev` address.
