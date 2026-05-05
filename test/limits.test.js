import assert from "node:assert/strict";
import { test } from "node:test";
import { reserveTelegramSlot, resetLimiterForTests } from "../lib/limits.js";

test("non-message methods are not throttled locally", () => {
  resetLimiterForTests();

  const slot = reserveTelegramSlot("getMe", {}, 1000);

  assert.equal(slot.limited, false);
  assert.equal(slot.delayMs, 0);
});

test("messages to the same private chat are spaced by one second", () => {
  resetLimiterForTests();

  const first = reserveTelegramSlot("sendMessage", { chat_id: 42 }, 1000);
  const second = reserveTelegramSlot("sendMessage", { chat_id: 42 }, 1000);

  assert.equal(first.delayMs, 0);
  assert.equal(second.delayMs, 1000);
  assert.equal(second.retryAfter, 1);
});

test("messages to group chats are spaced by three seconds", () => {
  resetLimiterForTests();

  const first = reserveTelegramSlot("sendMessage", { chat_id: -100, chat_type: "supergroup" }, 1000);
  const second = reserveTelegramSlot("sendMessage", { chat_id: -100, chat_type: "supergroup" }, 1000);

  assert.equal(first.delayMs, 0);
  assert.equal(second.delayMs, 3000);
  assert.equal(second.retryAfter, 3);
});

test("messages to different chats still reserve the global broadcast lane", () => {
  resetLimiterForTests();

  const first = reserveTelegramSlot("sendMessage", { chat_id: 1 }, 1000);
  const second = reserveTelegramSlot("sendMessage", { chat_id: 2 }, 1000);

  assert.equal(first.delayMs, 0);
  assert.equal(second.delayMs, 34);
  assert.equal(second.retryAfter, 1);
});
