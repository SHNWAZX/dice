import { sendMessage } from "./telegram.js";

const DICE_EMOJI = "\u{1F3B2}";

export function getIncomingMessage(update) {
  return update?.message || update?.edited_message || update?.channel_post || null;
}

function getDicePrediction(message, random = Math.random) {
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

export async function handleUpdate(update, options = {}) {
  const send = options.send || sendMessage;
  const message = getIncomingMessage(update);
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;

  if (!chatId) {
    return {
      handled: false,
      reason: "no_text_message"
    };
  }

  const dicePrediction = getDicePrediction(message, options.random);
  if (dicePrediction) {
    await send(chatId, `Prediction: ${dicePrediction}`);
    return {
      handled: true,
      type: "dice_prediction",
      value: dicePrediction
    };
  }

  if (!text) {
    return {
      handled: false,
      reason: "no_text_message"
    };
  }

  if (text === "/start") {
    await send(chatId, "Bot is online. Use /ping to check the API.");
    return {
      handled: true,
      command: "/start"
    };
  }

  if (text === "/ping") {
    await send(chatId, "pong");
    return {
      handled: true,
      command: "/ping"
    };
  }

  return {
    handled: false,
    reason: "unknown_command"
  };
}
