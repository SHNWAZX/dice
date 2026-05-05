import { methodNotAllowed, readJson, requireApiKey, sendJson, toPublicError } from "../lib/http.js";
import { callTelegram } from "../lib/telegram.js";

function requestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || (String(host).startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  const auth = requireApiKey(req);
  if (!auth.ok) {
    return sendJson(res, auth.statusCode, auth.body);
  }

  try {
    const body = await readJson(req);
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (!secret) {
      return sendJson(res, 500, {
        ok: false,
        error: "server_not_configured",
        message: "TELEGRAM_WEBHOOK_SECRET is not configured."
      });
    }

    const url = body.url || `${requestOrigin(req)}/api/webhook`;
    const result = await callTelegram(
      "setWebhook",
      {
        url,
        secret_token: secret,
        drop_pending_updates: Boolean(body.drop_pending_updates),
        allowed_updates: body.allowed_updates || ["message", "edited_message", "callback_query"]
      },
      {
        skipLocalLimit: true,
        retries: 0
      }
    );

    return sendJson(res, 200, {
      ok: true,
      webhook_url: url,
      telegram: result
    });
  } catch (error) {
    const publicError = toPublicError(error);
    return sendJson(res, publicError.statusCode, publicError.body);
  }
}
