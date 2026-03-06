# RPG Life

Gamified task planner in RPG style. Turn your daily routine into an adventure.

<!-- TODO: Add screenshot here -->
<!-- ![RPG Life Screenshot](docs/screenshot.png) -->

## Features

- **Tasks** — daily, recurring, and one-time tasks with XP and coin rewards
- **Character** — level up, attributes (STR, INT, DEX...), radar chart
- **Shop** — buy real-life rewards with earned coins and gems
- **Inventory** — track purchased items, loot boxes with drop tables
- **Crafting** — combine fragments into items
- **Achievements** — unlock milestones and earn bonus rewards
- **Reflection** — built-in journal with Tiptap WYSIWYG editor, mood tracker, daily reports
- **Habits** — track daily conditions and streaks
- **Profiles** — multiple character profiles

## Tech Stack

- React 19 + TypeScript + Tailwind CSS v4
- Zustand (state management + persistence)
- Electron 40 (desktop app — macOS, Windows, Linux)
- Tiptap (rich text editor)
- Vite 7 (build tool)

## Getting Started

```bash
# Install dependencies
npm install

# Run in browser (dev mode)
npm run dev

# Run as desktop app
npm run electron:dev

# Build desktop app
npm run electron:build
```

## Data Storage

All data is stored locally on your machine in `~/Documents/RPGLife/` as JSON files. No cloud, no telemetry, no tracking. Your data stays on your device.

## License

[MIT](LICENSE)
