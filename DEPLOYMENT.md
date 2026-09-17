# Deployment notes

Vercel is suitable for the frontend and API smoke testing, but its serverless filesystem is ephemeral. The backend's JSON storage is therefore not durable on Vercel; production deployments need a persistent backend host or external storage.

## Vercel environment variables

Required:

- `TELEGRAM_BOT_TOKEN`
- `APP_TOKEN_SECRET` — use a strong, randomly generated secret. If a token has ever been exposed, rotate it before deploying.

Optional:

- `DEV_AUTH=false` — keep this disabled in deployed environments; use it only for local development.
