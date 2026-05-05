import { sendJson } from "../lib/http.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, {
      ok: false,
      error: "method_not_allowed",
      allowed_methods: ["GET"]
    });
  }

  return sendJson(res, 200, {
    ok: true,
    service: "telegram-bot-api-vercel",
    configured: {
      telegram_bot_token: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      bot_api_key: Boolean(process.env.BOT_API_KEY),
      telegram_webhook_secret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET)
    }
  });
}
