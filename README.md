# Dice Bot

Simple Telegram bot that replies with a dice number when someone sends the dice emoji.

## Commands

- `/start` - shows a short start message
- `/ping` - replies with `pong`

## Run

```bash
npm install
TELEGRAM_BOT_TOKEN=123456:your_token npm start
```

On Windows PowerShell:

```powershell
$env:TELEGRAM_BOT_TOKEN="123456:your_token"
npm start
```

Deploy it as a worker/background service and set `TELEGRAM_BOT_TOKEN` in the cloud environment.
