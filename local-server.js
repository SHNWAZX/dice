import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import health from "./api/health.js";
import telegram from "./api/telegram.js";
import setWebhook from "./api/set-webhook.js";
import webhook from "./api/webhook.js";
import { handleUpdate } from "./lib/bot.js";
import { callTelegram } from "./lib/telegram.js";

const routes = new Map([
  ["/api/health", health],
  ["/api/telegram", telegram],
  ["/api/set-webhook", setWebhook],
  ["/api/webhook", webhook]
]);

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function loadEnvFile(file) {
  const path = resolve(file);
  if (!existsSync(path)) {
    return;
  }

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) {
      continue;
    }

    const separator = clean.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = clean.slice(0, separator).trim();
    const value = clean.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return fallback;
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body, null, 2));
}

async function startPolling() {
  let offset = 0;
  const allowedUpdates = ["message", "edited_message", "callback_query"];

  console.log("Local Telegram long polling enabled.");

  while (true) {
    try {
      const response = await callTelegram(
        "getUpdates",
        {
          offset,
          timeout: 25,
          allowed_updates: allowedUpdates
        },
        {
          skipLocalLimit: true,
          retries: 0
        }
      );

      for (const update of response.result || []) {
        offset = update.update_id + 1;
        const result = await handleUpdate(update);
        if (result.handled) {
          console.log(`Handled ${result.command} from update ${update.update_id}.`);
        }
      }

      if (response.dry_run && (!response.result || response.result.length === 0)) {
        await sleep(2000);
      }
    } catch (error) {
      const retryAfter = error?.retryAfter || 5;
      console.error(`Polling error: ${error.message}. Retrying in ${retryAfter}s.`);
      await sleep(retryAfter * 1000);
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const port = Number(argValue("--port", process.env.PORT || "333"));
const shouldPoll = process.argv.includes("--poll") || process.env.LOCAL_LONG_POLLING === "true";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${port}`}`);

  if (url.pathname === "/") {
    return sendJson(res, 200, {
      ok: true,
      service: "telegram-bot-api-vercel",
      endpoints: ["/api/health", "/api/telegram", "/api/webhook", "/api/set-webhook"],
      local_long_polling: shouldPoll
    });
  }

  const handler = routes.get(url.pathname);
  if (!handler) {
    return sendJson(res, 404, {
      ok: false,
      error: "not_found"
    });
  }

  try {
    return await handler(req, res);
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: "local_server_error",
      message: error.message
    });
  }
});

server.listen(port, () => {
  console.log(`Local Telegram API server running at http://localhost:${port}`);
  console.log("Use BOT_DRY_RUN=true for safe local endpoint tests without sending Telegram messages.");
});

if (shouldPoll) {
  startPolling();
}
