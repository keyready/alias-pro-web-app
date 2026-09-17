# Deployment notes

Vercel is suitable for the frontend and API smoke testing, but its serverless filesystem is ephemeral. The backend's JSON storage is therefore not durable on Vercel; production deployments need a persistent backend host or external storage.

By default, local development stores JSON files under `backend/data`. You can override the storage root with `ALIAS_STORAGE_DIR`. When Vercel sets the `VERCEL` environment variable and `ALIAS_STORAGE_DIR` is not configured, the API automatically uses `/tmp/alias-web-data` so seed data, dictionary uploads, auth user writes, and game writes target a writable location. Vercel `/tmp` storage is ephemeral and instance-local; it can be cleared between cold starts/deployments and is not suitable for durable production data.

## Vercel environment variables

Required:

- `TELEGRAM_BOT_TOKEN`
- `APP_TOKEN_SECRET` — use a strong, randomly generated secret. If a token has ever been exposed, rotate it before deploying.

Optional:

- `DEV_AUTH=false` — keep this disabled in deployed environments; use it only for local development.
- `ALIAS_STORAGE_DIR` — override the backend JSON storage root. Leave unset on Vercel to use the automatic `/tmp/alias-web-data` smoke-test storage, or point it at a writable mounted/persistent location on non-Vercel hosts.
