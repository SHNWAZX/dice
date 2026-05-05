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
