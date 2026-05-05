import { methodNotAllowed, readJson, sendJson, toPublicError } from "../lib/http.js";
import { sendMessage } from "../lib/telegram.js";

function verifiedTelegramSecret(req) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    return false;
  }

  return req.headers["x-telegram-bot-api-secret-token"] === expected;
}

function getIncomingMessage(update) {
  return update?.message || update?.edited_message || update?.channel_post || null;
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
    const message = getIncomingMessage(update);
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;

    if (chatId && text === "/start") {
      await sendMessage(chatId, "Bot is online. Use /ping to check the API.");
    } else if (chatId && text === "/ping") {
      await sendMessage(chatId, "pong");
    }

    return sendJson(res, 200, {
      ok: true
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
