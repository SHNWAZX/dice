# Telegram Bot API on Vercel

This is a Vercel-ready Telegram Bot API wrapper with webhook support and safe anti-flood handling.

It does not remove Telegram limits. Telegram enforces flood control on its platform. The safe path is to throttle, queue, and honor `retry_after` when Telegram returns `429`.

The repo also includes a glass-style documentation website at `/` with a local API tester.

## What It Does

- `GET /` serves the hosted docs website.
- `POST /api/telegram` calls any Telegram Bot API method with your bot token kept server-side.
- `POST /api/webhook` receives Telegram webhook updates and responds to `/start` and `/ping`.
- `POST /api/set-webhook` registers the deployed webhook URL with Telegram.
- `GET /api/health` checks whether required environment variables are configured.
- Local throttling avoids common free-tier limits: about one message per second per private chat, one message every three seconds for groups when `chat_type` is supplied, and about 30 outgoing messages per second globally.
- Telegram `429` responses are handled with `retry_after`; short waits are retried, longer waits are returned to the caller.

## Official Limits

Telegram documents these free broadcast limits in the Bot FAQ:

- Single chat: avoid more than one message per second.
- Group chats: no more than 20 messages per minute.
- Bulk notifications: about 30 messages per second.

Telegram also documents Paid Broadcasts in the Bot API, which can raise broadcast throughput up to 1000 messages per second for a Telegram Stars fee. A local Bot API server changes file, upload, and webhook hosting behavior, but it does not make abuse or flood limits disappear.

Sources:

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Bots FAQ](https://core.telegram.org/bots/faq)

## Environment Variables

Create these in Vercel Project Settings:

```bash
TELEGRAM_BOT_TOKEN=123456:your_botfather_token
BOT_API_KEY=make_this_a_long_random_secret
TELEGRAM_WEBHOOK_SECRET=another_long_random_secret
```

Optional:

```bash
TELEGRAM_API_BASE_URL=https://api.telegram.org
```

## Deploy on Vercel

Install and run locally:

```bash
npm install
npm run dev:333
```

Open:

```text
http://localhost:333/api/health
```

For safe local tests without sending Telegram messages, set `BOT_DRY_RUN=true`.

PowerShell example:

```powershell
$env:BOT_DRY_RUN="true"
$env:BOT_API_KEY="local-test-key"
$env:TELEGRAM_WEBHOOK_SECRET="local-webhook-secret"
$env:TELEGRAM_BOT_TOKEN="local:dry-run"
npm run dev:333
```

Test the API wrapper:

```powershell
Invoke-RestMethod -Method Post "http://localhost:333/api/telegram" `
  -Headers @{ "x-api-key" = "local-test-key" } `
  -ContentType "application/json" `
  -Body '{"method":"sendMessage","payload":{"chat_id":123,"text":"hello local"}}'
```

For real local bot replies without a public webhook URL, use long polling:

```powershell
$env:BOT_DRY_RUN="false"
$env:TELEGRAM_BOT_TOKEN="123456:your_real_token"
$env:BOT_API_KEY="local-test-key"
$env:TELEGRAM_WEBHOOK_SECRET="local-webhook-secret"
npm run dev:333:poll
```

If your deployed webhook is already set, Telegram will reject `getUpdates`. Remove the webhook first with Telegram's `deleteWebhook` method before long polling locally, then set it again after deploying.

Deploy:

```bash
npx vercel
```

After deployment, set the webhook:

```bash
curl -X POST "https://your-project.vercel.app/api/set-webhook" \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_BOT_API_KEY" \
  -d "{}"
```

## Call Telegram Safely

```bash
curl -X POST "https://your-project.vercel.app/api/telegram" \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_BOT_API_KEY" \
  -d '{
    "method": "sendMessage",
    "payload": {
      "chat_id": 123456789,
      "text": "Hello from Vercel"
    }
  }'
```

For group chats, include `chat_type` so the local limiter can use the stricter group spacing:

```json
{
  "method": "sendMessage",
  "payload": {
    "chat_id": -1001234567890,
    "chat_type": "supergroup",
    "text": "Hello group"
  }
}
```

## Production Note

Vercel serverless instances can scale horizontally, so in-memory throttling is best-effort. For high-volume or broadcast jobs, add a durable queue and shared rate limiter such as Upstash Redis, Vercel KV, or another database-backed queue. That keeps every instance coordinated and prevents accidental `429` bursts.
