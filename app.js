const healthText = document.querySelector("#healthText");
const responseOutput = document.querySelector("#responseOutput");
const sendButton = document.querySelector("#sendTest");
const apiKeyInput = document.querySelector("#apiKey");
const methodInput = document.querySelector("#method");
const payloadInput = document.querySelector("#payload");
const navLinks = [...document.querySelectorAll(".side-nav a")];

async function updateHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    const ready = data.configured?.telegram_bot_token && data.configured?.bot_api_key;
    healthText.textContent = ready ? "Local API online" : "API online, env needed";
  } catch {
    healthText.textContent = "API offline";
  }
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  const oldLabel = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => {
    button.textContent = oldLabel;
  }, 1400);
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copy, button));
});

sendButton?.addEventListener("click", async () => {
  responseOutput.textContent = "Sending...";

  try {
    const payload = payloadInput.value.trim() ? JSON.parse(payloadInput.value) : {};
    const response = await fetch("/api/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKeyInput.value
      },
      body: JSON.stringify({
        method: methodInput.value,
        payload
      })
    });

    responseOutput.textContent = pretty(await response.json());
  } catch (error) {
    responseOutput.textContent = pretty({
      ok: false,
      error: error.message
    });
  }
});

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) {
      return;
    }

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  },
  {
    rootMargin: "-20% 0px -60% 0px",
    threshold: [0.1, 0.3, 0.6]
  }
);

document.querySelectorAll("section[id]").forEach((section) => observer.observe(section));

updateHealth();
