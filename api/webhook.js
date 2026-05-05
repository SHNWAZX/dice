import { methodNotAllowed, readJson, sendJson, toPublicError } from "../lib/http.js";
import { handleUpdate } from "../lib/bot.js";

function verifiedTelegramSecret(req) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    return false;
  }

  return req.headers["x-telegram-bot-api-secret-token"] === expected;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!verifiedTelegramSecret(req)) {
    return sendJson(res, 401, {
      ok: false,
      error: "invalid_webhook_secret"
    });
  }

  try {
    const update = await readJson(req);
    const result = await handleUpdate(update);

    return sendJson(res, 200, {
      ok: true,
      ...result
    });
  } catch (error) {
    const publicError = toPublicError(error);

    if (publicError.statusCode === 429) {
      return sendJson(res, 200, {
        ok: true,
        limited: true,
        retry_after: publicError.body.retry_after
      });
    }

    return sendJson(res, publicError.statusCode, publicError.body);
  }
}
