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

Configure these GitHub OAuth callbacks:

```text
http://localhost:3000/api/auth/callback/github
https://studplan.ahse.dev/api/auth/callback/github
```

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
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Then deploy:

```sh
vp run deploy
```

Deployment builds the app, applies remote D1 migrations, uploads `.env.prod` with
`wrangler secret bulk`, deploys the Worker, and attaches `studplan.ahse.dev` as its
Cloudflare-managed custom domain. `APP_URL` is the non-secret production variable in
`wrangler.jsonc`.
