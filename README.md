# FortifyFi

> Your finances. Your fortress.

FortifyFi is a gamified financial literacy app that turns real spending behavior into a tower defense game. The better you manage your money, the stronger your defenses.

---

## How It Works

1. **Connect your account** — synthetic bank data is generated via the Capital One Nessie API
2. **AI analysis** — a local LLM (Ollama) categorizes your spending and calculates a weekly financial score (0–100)
3. **Play the game** — your score determines the enemy wave difficulty. Good spending habits = easy wave. Overspending = harder enemies
4. **Earn points** — stay within budget to earn in-game points, used to build towers and defend your city

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Next.js 14 (App Router) |
| Game Engine | Phaser.js |
| Backend / DB | Supabase (auth + real-time database) |
| AI | Ollama (`qwen2.5:7b` — runs locally, free) |
| Bank Data | Nessie API (Capital One sandbox) |
| Deployment | Vercel |

---

## Game Guide

### Towers
| Tower | Cost | Damage | Fire Rate | Special |
|-------|------|--------|-----------|---------|
| Archer | 50 pts | 20 | Fast | — |
| Cannon | 120 pts | 60 | Slow | Splash damage |

### Controls
- **Click a tower type** in the top bar to select it (highlighted in gold)
- **Click any non-path cell** on the grid to place a tower
- **Hover over a placed tower** to see its attack range
- Towers auto-attack the nearest enemy in range

### Scoring
| Financial Score | Wave Difficulty | Starting Bonus |
|----------------|-----------------|----------------|
| 80–100 | Easy (8 enemies) | Cannon tower unlocked |
| 50–79 | Medium (14 enemies) | — |
| 0–49 | Hard (20 enemies) | City starts damaged |

### Tips
- Place Archer towers along the early path segments for consistent damage
- Use Cannon towers at choke points (corners) to maximize splash
- Each enemy you kill earns 10 points back
- Each enemy that reaches your city deals 20 HP damage

---

## Local Development

### Prerequisites
- Node.js 18+
- [Ollama](https://ollama.com) with `qwen2.5:7b` pulled
- [Supabase](https://supabase.com) project (free tier)
- [Nessie API](http://api.nessieisreal.com) key

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/FinGame.git
cd FinGame

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in your keys (see below)

# 4. Run the Supabase schema
# Paste supabase/schema.sql into your Supabase SQL Editor and run it
# Then paste supabase/functions.sql and run it

# 5. Start Ollama
ollama serve

# 6. Start the dev server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NESSIE_API_KEY=your_nessie_key
NESSIE_BASE_URL=http://api.nessieisreal.com
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

### First Run
1. Sign up at `http://localhost:3000/signup`
2. On the dashboard, click **"Set Up Account"** — this seeds your Nessie data and runs the AI analysis (~30s)
3. Once data loads, click **"Play This Week"** to start the game

---

## Project Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Auth pages
│   ├── signup/
│   ├── dashboard/            # Main dashboard
│   ├── game/                 # Game page
│   └── api/
│       ├── seed/             # Seeds Nessie account + transactions
│       └── weekly-loop/      # Runs Analyst + Game Engine agents
├── agents/
│   ├── analyst.ts            # Financial Analyst Agent (Ollama)
│   └── gameEngine.ts         # Game Engine Agent (score → wave config)
├── components/
│   └── game/
│       ├── GameScene.ts      # Phaser game scene (towers, enemies, combat)
│       └── GameCanvas.tsx    # React wrapper for Phaser
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── ollama.ts             # Ollama chat wrapper
│   ├── nessie.ts             # Nessie API wrapper
│   ├── seed.ts               # Nessie data seeder
│   └── types.ts              # Shared TypeScript types
└── supabase/
    ├── schema.sql            # Database tables + RLS policies
    └── functions.sql         # Supabase RPC functions
```

---

## Roadmap

- [ ] NPC advisors (The Warden, The Scout, The Alchemist, The Merchant, The Oracle)
- [ ] More tower types (Frost, Mortar, Wall)
- [ ] Named enemies (Impulse Spender, Subscription Creep)
- [ ] Weekly boss battles tied to savings streaks
- [ ] Goal Setting Agent with personalized weekly targets
- [ ] Real banking API integration (Plaid)
- [ ] Weekly leaderboards and friend challenges
