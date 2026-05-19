const DICE_EMOJI = "\u{1F3B2}";
const TELEGRAM_API_BASE = "https://api.telegram.org";
const POLL_TIMEOUT_SECONDS = 25;
const RETRY_DELAY_MS = 5000;

const token = process.env.TELEGRAM_BOT_TOKEN;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireToken() {
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }
}

async function callTelegram(method, payload = {}) {
  requireToken();

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({
    ok: false,
    description: `Telegram returned HTTP ${response.status}.`
  }));

  if (!body.ok) {
    throw new Error(body.description || "Telegram request failed.");
  }

  return body.result;
}

function dicePrediction(message, random = Math.random) {
  const dice = message?.dice;
  if (
    dice?.emoji === DICE_EMOJI &&
    Number.isInteger(dice.value) &&
    dice.value >= 1 &&
    dice.value <= 6
  ) {
    return dice.value;
  }

  if (message?.text?.trim() === DICE_EMOJI) {
    return Math.floor(random() * 6) + 1;
  }

  return null;
}

async function sendMessage(chatId, text) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text
  });
}

async function handleUpdate(update) {
  const message = update?.message || update?.edited_message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim();

  if (!chatId) {
    return false;
  }

  const prediction = dicePrediction(message);
  if (prediction) {
    await sendMessage(chatId, `Prediction: ${prediction}`);
    return true;
  }

  if (text === "/start") {
    await sendMessage(chatId, "Send dice emoji and I will predict the number.");
    return true;
  }

  if (text === "/ping") {
    await sendMessage(chatId, "pong");
    return true;
  }

  return false;
}

async function startBot() {
  requireToken();

  let offset = 0;
  console.log("Dice bot started. Send dice emoji to test it.");

  while (true) {
    try {
      const updates = await callTelegram("getUpdates", {
        offset,
        timeout: POLL_TIMEOUT_SECONDS,
        allowed_updates: ["message", "edited_message"]
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        const handled = await handleUpdate(update);
        if (handled) {
          console.log(`Handled update ${update.update_id}.`);
        }
      }
    } catch (error) {
      console.error(`Bot error: ${error.message}`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

startBot().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
