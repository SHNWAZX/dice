const FREE_GLOBAL_INTERVAL_MS = 34;
const PAID_BROADCAST_GLOBAL_INTERVAL_MS = 1;
const PRIVATE_CHAT_INTERVAL_MS = 1000;
const GROUP_CHAT_INTERVAL_MS = 3000;
const MAX_KEYS = 5000;

const state = {
  globalNextAt: 0,
  chatNextAt: new Map()
};

const OUTGOING_MESSAGE_METHODS = new Set([
  "sendMessage",
  "forwardMessage",
  "forwardMessages",
  "copyMessage",
  "copyMessages",
  "sendPhoto",
  "sendAudio",
  "sendDocument",
  "sendVideo",
  "sendAnimation",
  "sendVoice",
  "sendVideoNote",
  "sendMediaGroup",
  "sendLocation",
  "sendVenue",
  "sendContact",
  "sendPoll",
  "sendDice",
  "sendSticker",
  "sendInvoice",
  "sendGame"
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMethod(method) {
  if (typeof method !== "string") {
    return "";
  }

  const clean = method.trim();
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

function methodNeedsMessageLimit(method) {
  const normalized = normalizeMethod(method);
  for (const allowed of OUTGOING_MESSAGE_METHODS) {
    if (allowed.toLowerCase() === normalized.toLowerCase()) {
      return true;
    }
  }

  return false;
}

function chatIntervalMs(payload = {}) {
  const type = String(payload.chat_type || payload.chatType || "").toLowerCase();
  if (type === "group" || type === "supergroup") {
    return GROUP_CHAT_INTERVAL_MS;
  }

  return PRIVATE_CHAT_INTERVAL_MS;
}

function chatKey(payload = {}) {
  const chatId = payload.chat_id ?? payload.chatId;
  if (chatId === undefined || chatId === null || chatId === "") {
    return null;
  }

  return String(chatId);
}

function usesPaidBroadcast(payload = {}) {
  return payload.allow_paid_broadcast === true || payload.allowPaidBroadcast === true;
}

function pruneChatState(now) {
  if (state.chatNextAt.size <= MAX_KEYS) {
    return;
  }

  for (const [key, nextAt] of state.chatNextAt) {
    if (nextAt <= now) {
      state.chatNextAt.delete(key);
    }

    if (state.chatNextAt.size <= MAX_KEYS) {
      break;
    }
  }
}

export function reserveTelegramSlot(method, payload = {}, now = Date.now()) {
  if (!methodNeedsMessageLimit(method)) {
    return {
      limited: false,
      delayMs: 0,
      retryAfter: 0
    };
  }

  const key = chatKey(payload);
  const paidBroadcast = usesPaidBroadcast(payload);
  const globalIntervalMs = paidBroadcast ? PAID_BROADCAST_GLOBAL_INTERVAL_MS : FREE_GLOBAL_INTERVAL_MS;
  const globalDelay = Math.max(0, state.globalNextAt - now);
  const perChatDelay = key ? Math.max(0, (state.chatNextAt.get(key) || 0) - now) : 0;
  const delayMs = Math.max(globalDelay, perChatDelay);
  const reservedAt = now + delayMs;

  state.globalNextAt = reservedAt + globalIntervalMs;
  if (key) {
    state.chatNextAt.set(key, reservedAt + chatIntervalMs(payload));
  }
  pruneChatState(now);

  return {
    limited: delayMs > 0,
    delayMs,
    retryAfter: Math.ceil(delayMs / 1000),
    paidBroadcast
  };
}

export async function waitForTelegramSlot(method, payload = {}, options = {}) {
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const reservation = reserveTelegramSlot(method, payload, options.now ?? Date.now());

  if (reservation.delayMs > maxDelayMs) {
    return {
      ok: false,
      ...reservation
    };
  }

  if (reservation.delayMs > 0) {
    await sleep(reservation.delayMs);
  }

  return {
    ok: true,
    ...reservation
  };
}

export function resetLimiterForTests() {
  state.globalNextAt = 0;
  state.chatNextAt.clear();
}
