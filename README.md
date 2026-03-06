# RPG Life

**Turn your boring routine into an epic adventure.**

RPG Life is a gamified task planner that turns every completed task into XP, coins, and character progression. Built for people who struggle with discipline — even those who have never had it. When your to-do list feels like a quest log and completing tasks earns you loot, staying productive becomes addictive.

## Why RPG Life?

Traditional planners rely on willpower alone. That works for about 3 days. RPG Life adds the missing ingredient — **instant reward feedback**.

- Complete a task? You see coins fly across the screen and XP filling your bar
- Hit a streak? Your rewards multiply
- Reach a milestone? An achievement unlocks with bonus loot
- Earn enough coins? Buy yourself a real-life reward from your personal shop

This isn't just a planner with a game skin. It's a full RPG progression system designed around behavioral psychology — the same loops that make games addictive, applied to your real life.

---

## Core Features

### Tasks & Quests

Your daily tasks become quests with real rewards.

- **3 task types:** checkbox (yes/no), counter (progress to goal), nested (with subtasks)
- **Smart recurrence:** daily, weekly (by days or N times/week), monthly, yearly, custom intervals, instant (repeatable anytime)
- **Difficulty levels:** Easy, Medium, Hard, Very Hard — each with scaling XP and coin rewards
- **Deadlines & priorities** — never miss what matters
- **Task groups** — organize by category (Work, Health, Learning...)
- **Custom icons** — pick from 240+ icons or add your own
- **Full history** — see every completion with timestamps and earned rewards

### Character Progression

Level up your real-life character.

- **XP & levels** — every task gives XP. Level up to unlock new ranks (Novice > Apprentice > Pathfinder > Warrior > Veteran > Expert > Master > Grandmaster > Legend)
- **6 attributes** — Strength, Intelligence, Dexterity, Endurance, Creativity, Charisma. Link tasks to attributes and watch them grow
- **Radar chart** — visual representation of your attribute balance on the Status page
- **3 leveling curves** — Standard (soft progression), Fast (quick early rewards), Custom (define your own XP curve)
- **Multiple profiles** — run different characters for different life areas

### Economy & Shop

Earn virtual currency. Spend it on real rewards.

- **2 currencies:** Coins (common) and Gems (rare, premium)
- **Personal shop** — add YOUR rewards: new sneakers, a movie night, a day off, a new game
- **Item rarity:** Common, Uncommon, Rare, Epic, Legendary — with matching visual styles
- **Item groups** — organize your shop by category with custom colors
- **Discount vouchers** — use coupons to get % off your next purchase
- **Stock control** — limit availability of items to make them feel special
- **Purchase history** — full log of everything you've bought and when

### Loot Boxes

Add randomness and excitement.

- **Weighted drop tables** — configure probability for each possible reward
- **Currency drops** — loot boxes can contain coins or gems
- **Duplicate protection** — if you already own the item or it's out of stock, you get coin compensation
- **Zero-weight fallback** — even an empty loot box gives back 50% of its cost

### Video Games & Series Tracking

Track entertainment as rewards.

- **Video games** — buy the game, then purchase time packs (hours) to play. Track total playtime
- **TV series** — buy seasons, mark episodes as watched. Each episode has its own price
- **Integrated into inventory** — use items directly from your collection

### Streaks & Multipliers

Consistency gets rewarded exponentially.

- **Streak tracking** — current streak, best streak, total skips for every recurring task
- **Streak multiplier items** — equip a 1.5x, 2x, or 2.5x multiplier to a specific task
- **Two multiplier modes:** streak-based (triggers every N completions) and instant (limited uses)
- **Streak freeze** — protect your streak during vacations or sick days
- **Auto-deactivation** — multipliers drop off if you break the streak

### Crafting System

Collect fragments. Forge powerful items.

- **Fragment sources:**
  - Task-linked — fragments drop when you complete specific tasks (with configurable drop chance)
  - Habit-linked — earn fragments from daily conditions
  - Streak rewards — reach a streak milestone to get a fragment
  - Random drops — chance to get fragments from any task
- **Crafting cost** — recipes may require coins/gems on top of fragments
- **Progress tracking** — visual progress bar for each recipe
- **Recipes produce shop items** — craft results go directly to your inventory

### Achievements

Unlock milestones and earn bonus rewards.

- **10+ condition types:** tasks completed, streaks reached, attributes leveled, coins earned, items used, habits tracked, and more
- **Reward bundles** — achievements grant coins, gems, XP, and even items
- **Repeatable achievements** — some reset after completion for ongoing challenges
- **Custom achievements** — create your own with manual unlock
- **Achievement groups** — organize with custom icons and colors

### Reflection & Journal

Built-in mini-Notion for self-reflection.

- **Notes** — rich text editor (Tiptap WYSIWYG) with formatting, links, and image support
- **Folders** — organize notes into categories
- **Link notes to tasks** — connect your reflections to specific goals
- **Trash with recovery** — soft delete, restore, or permanently remove
- **Daily reports** — automatic summary of your day: completed tasks, purchases, achievements, XP earned
- **Mood tracker** — rate your day (1-5 scale), see mood trends over time on a chart
- **Daily photos** — attach photos to your diary entries

### Daily Conditions (Habits)

Track daily habits and routines.

- **Checkbox habits** — "Did I exercise today?", "Did I read?", "Did I eat healthy?"
- **Streak tracking** — current streak, best streak, completion history
- **Integration with achievements** — habits can trigger achievement conditions
- **Integration with crafting** — habits can be fragment sources
- **Daily report inclusion** — habits appear in your automatic day summary

### Notifications

Stay on track without checking the app.

- **In-app toasts** — animated notifications for completions, purchases, achievements, level ups
- **Floating rewards** — coins and gems fly across the screen when you earn them
- **OS-level notifications** — deadline reminders, daily task reminders, achievement alerts
- **Granular control** — enable/disable each notification type independently
- **Custom reminder time** — set your preferred daily reminder (HH:MM)

---

## Privacy & Data

**Your data stays on your device. Period.**

- All data stored locally in `~/Documents/RPGLife/` as plain JSON files
- No cloud sync, no telemetry, no analytics, no tracking
- Atomic writes (tmp file + rename) to prevent data corruption
- Full export/import — take your data anywhere
- Open source — verify yourself that there's nothing hidden

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| Zustand | State management |
| Electron 40 | Desktop app (macOS, Windows, Linux) |
| Tiptap | Rich text editor |
| Vite 7 | Build tool |
| Vitest | Testing |

---

## Getting Started

```bash
# Install dependencies
npm install

# Run in browser (dev mode)
npm run dev

# Run as Electron desktop app
npm run electron:dev

# Build for production
npm run electron:build

# Run tests
npm run test
```

---

## License

[MIT](LICENSE)
