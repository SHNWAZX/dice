import { waitForTelegramSlot } from "./limits.js";

const DEFAULT_BASE_URL = "https://api.telegram.org";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertMethod(method) {
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(method || "")) {
    throw new TelegramError("Invalid Telegram method name.", {
      statusCode: 400,
      body: {
        ok: false,
        error_code: 400,
        description: "Invalid Telegram method name."
      }
    });
  }
}

function getToken(options = {}) {
  const token = options.token || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new TelegramError("TELEGRAM_BOT_TOKEN is not configured.", {
      statusCode: 500,
      body: {
        ok: false,
        error_code: 500,
        description: "TELEGRAM_BOT_TOKEN is not configured."
      }
    });
  }

  return token;
}

function telegramUrl(token, method) {
  const baseUrl = (process.env.TELEGRAM_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return `${baseUrl}/bot${token}/${method}`;
}

function retryAfterFrom(body) {
  const retryAfter = body?.parameters?.retry_after;
  if (Number.isFinite(retryAfter)) {
    return retryAfter;
  }

  return undefined;
}

export class TelegramError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "TelegramError";
    this.statusCode = options.statusCode;
    this.retryAfter = options.retryAfter;
    this.body = options.body;
  }
}

export async function callTelegram(method, payload = {}, options = {}) {
  assertMethod(method);

  const token = getToken(options);
  const retries = options.retries ?? 1;
  const maxRetryWaitMs = options.maxRetryWaitMs ?? 8000;
  let attempt = 0;

  while (attempt <= retries) {
    if (!options.skipLocalLimit) {
      const slot = await waitForTelegramSlot(method, payload, {
        maxDelayMs: options.maxLocalDelayMs ?? 8000
      });

      if (!slot.ok) {
        throw new TelegramError("Telegram send rate limit is active. Try again later.", {
          statusCode: 429,
          retryAfter: slot.retryAfter,
          body: {
            ok: false,
            error_code: 429,
            description: "Local Telegram send rate limit is active.",
            parameters: {
              retry_after: slot.retryAfter
            }
          }
        });
      }
    }

    const response = await fetch(telegramUrl(token, method), {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload || {})
    });

    const body = await response.json().catch(() => ({
      ok: false,
      error_code: response.status,
      description: `Telegram returned HTTP ${response.status}.`
    }));

    if (body.ok) {
      return body;
    }

    const retryAfter = retryAfterFrom(body);
    const isFloodWait = response.status === 429 || body.error_code === 429;

    if (
      isFloodWait &&
      retryAfter &&
      attempt < retries &&
      retryAfter * 1000 <= maxRetryWaitMs
    ) {
      await sleep(retryAfter * 1000);
      attempt += 1;
      continue;
    }

    throw new TelegramError(body.description || "Telegram API request failed.", {
      statusCode: body.error_code || response.status || 502,
      retryAfter,
      body
    });
  }

  throw new TelegramError("Telegram API request failed.", {
    statusCode: 502
  });
}

export function sendMessage(chatId, text, extra = {}) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}
