import { methodNotAllowed, readJson, requireApiKey, sendJson, toPublicError } from "../lib/http.js";
import { callTelegram } from "../lib/telegram.js";

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
    const { method, payload = {} } = body;

    if (!method) {
      return sendJson(res, 400, {
        ok: false,
        error: "missing_method"
      });
    }

    const result = await callTelegram(method, payload, {
      retries: 1,
      maxRetryWaitMs: 8000,
      maxLocalDelayMs: 8000
    });

    return sendJson(res, 200, result);
  } catch (error) {
    const publicError = toPublicError(error);
    return sendJson(res, publicError.statusCode, publicError.body);
  }
}
