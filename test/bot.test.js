import assert from "node:assert/strict";
import { test } from "node:test";
import { handleUpdate } from "../lib/bot.js";

test("handles /ping updates", async () => {
  const sent = [];

  const result = await handleUpdate(
    {
      message: {
        chat: {
          id: 123
        },
        text: "/ping"
      }
    },
    {
      send: async (chatId, text) => {
        sent.push({ chatId, text });
      }
    }
  );

  assert.deepEqual(result, {
    handled: true,
    command: "/ping"
  });
  assert.deepEqual(sent, [
    {
      chatId: 123,
      text: "pong"
    }
  ]);
});

test("predicts Telegram dice updates", async () => {
  const sent = [];

  const result = await handleUpdate(
    {
      message: {
        chat: {
          id: 123
        },
        dice: {
          emoji: "\u{1F3B2}",
          value: 4
        }
      }
    },
    {
      send: async (chatId, text) => {
        sent.push({ chatId, text });
      }
    }
  );

  assert.deepEqual(result, {
    handled: true,
    type: "dice_prediction",
    value: 4
  });
  assert.deepEqual(sent, [
    {
      chatId: 123,
      text: "Prediction: 4"
    }
  ]);
});

test("predicts plain dice emoji text", async () => {
  const sent = [];

  const result = await handleUpdate(
    {
      message: {
        chat: {
          id: 123
        },
        text: "\u{1F3B2}"
      }
    },
    {
      random: () => 0.75,
      send: async (chatId, text) => {
        sent.push({ chatId, text });
      }
    }
  );

  assert.deepEqual(result, {
    handled: true,
    type: "dice_prediction",
    value: 5
  });
  assert.deepEqual(sent, [
    {
      chatId: 123,
      text: "Prediction: 5"
    }
  ]);
});

test("ignores unknown text commands", async () => {
  const result = await handleUpdate({
    message: {
      chat: {
        id: 123
      },
      text: "/unknown"
    }
  });

  assert.equal(result.handled, false);
  assert.equal(result.reason, "unknown_command");
});
