export async function readJson(req) {
  if (req.body && typeof req.body === "object") {
    if (Buffer.isBuffer(req.body)) {
      const raw = req.body.toString("utf8").trim();
      return raw ? JSON.parse(raw) : {};
    }

    return req.body;
  }

  if (typeof req.body === "string") {
    const raw = req.body.trim();
    return raw ? JSON.parse(raw) : {};
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

export function sendJson(res, statusCode, body, headers = {}) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");

  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }

  res.end(JSON.stringify(body));
}

export function methodNotAllowed(res, allowedMethods) {
  sendJson(
    res,
    405,
    {
      ok: false,
      error: "method_not_allowed",
      allowed_methods: allowedMethods
    },
    {
      allow: allowedMethods.join(", ")
    }
  );
}

export function requireApiKey(req) {
  const expected = process.env.BOT_API_KEY;
  if (!expected) {
    return {
      ok: false,
      statusCode: 500,
      body: {
        ok: false,
        error: "server_not_configured",
        message: "BOT_API_KEY is not configured."
      }
    };
  }

  const authorization = req.headers.authorization;
  const bearer = authorization?.replace(/^Bearer\s+/i, "");
  const provided = req.headers["x-api-key"] || bearer;

  if (provided !== expected) {
    return {
      ok: false,
      statusCode: 401,
      body: {
        ok: false,
        error: "unauthorized"
      }
    };
  }

  return { ok: true };
}

export function toPublicError(error) {
  if (error?.name === "TelegramError") {
    return {
      statusCode: error.statusCode || 502,
      body: {
        ok: false,
        error: "telegram_error",
        message: error.message,
        retry_after: error.retryAfter,
        telegram: error.body
      }
    };
  }

  if (error instanceof SyntaxError) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        error: "invalid_json"
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      ok: false,
      error: "internal_error",
      message: error?.message || "Unknown error"
    }
  };
}
