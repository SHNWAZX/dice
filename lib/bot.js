import { sendMessage } from "./telegram.js";

export function getIncomingMessage(update) {
  return update?.message || update?.edited_message || update?.channel_post || null;
}

export async function handleUpdate(update, options = {}) {
  const send = options.send || sendMessage;
  const message = getIncomingMessage(update);
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;

  if (!chatId || !text) {
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
