# FPL Transfer Advisor

I'm a massive FPL nerd. So I built something that actually helps me play.

Give it your team ID and it tells you exactly who to transfer this gameweek and why — not just a score, but actual reasoning based on fixture difficulty, form, blank gameweeks, and double gameweeks.

**Live demo → [fpl-demo-six.vercel.app](https://fpl-demo-six.vercel.app)**
---

## Demo

<video src="FPL_Architecture.mov" controls width="100%"></video>

---

## System Architecture

![FPL Advisor Architecture](FPL_Architecture.jpg)

FPL data gets pulled every hour. Any price or injury change fires a Kafka event which invalidates the Redis cache. Every advice request goes through the scoring algorithm before Groq writes the plain-English reasoning.

---

## How It Works

1. `fpl-sync-service` polls the FPL public API every hour and writes players, fixtures, and teams to PostgreSQL
2. If a player's price or status changed since the last sync, it fires a Kafka event
3. `event-consumer` picks up those events and invalidates the relevant Redis keys
4. When you hit `/transfer-advice/:teamId`, `api-gateway` forwards the request to `advice-service`
5. `advice-service` scores every player in your squad, finds the weakest starters, ranks replacements, then sends the data to Groq
6. Groq returns plain-English reasoning specific fixtures, form numbers, and FDR values

---

## Stack

| Layer | Tech |
|---|---|
| Framework | NestJS + TypeScript |
| Database | PostgreSQL via Prisma |
| Cache | Redis |
| Messaging | Kafka |
| Scheduler | @nestjs/schedule |
| AI | Groq — llama-3.3-70b-versatile |
| Infra | Docker Compose |

---

## Running It Locally

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/ujjwalbhatta/fpl-advisor
cd fpl-advisor
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
DATABASE_URL=postgresql://fpl:fpl@localhost:5432/fpl_advisor
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9093
KAFKA_GROUP_ID=fpl-advisor-group
GROQ_API_KEY=your_key_here        # free at console.groq.com
ADVICE_SERVICE_PORT=3002
ADVICE_SERVICE_URL=http://localhost:3002
FPL_BASE_URL=https://fantasy.premierleague.com/api
```

### 3. Start infrastructure

```bash
docker-compose up -d
```

### 4. Set up the database

```bash
npm run db:generate
npm run db:push
```

### 5. Run the four services

Open four terminals:

```bash
# Terminal 1 — pulls FPL data every hour, fires Kafka events on changes
npm run start:fpl-sync

# Terminal 2 — Kafka consumer, invalidates Redis cache on price/injury changes
npm run start:consumer

# Terminal 3 — scoring algorithm + Groq AI reasoning
npm run start:advice

# Terminal 4 — public API gateway
npm run start:api-gateway
```

Swagger docs at `http://localhost:3000/api`

---

## Scoring Algorithm

Each player gets a numeric score. Top picks and weakest-squad detection both use this.

```
Position-specific base score
  GKP  →  clean sheets (heavy) + ppg + form
  DEF  →  clean sheets + form + xG/xA + goals/assists + penalty bonus
  MID  →  form + ppg + xG/xA + ICT index + penalty bonus
  FWD  →  form + xG per 90 (heavy) + xA + goals/assists + penalty bonus

Fixture score (next 3 GWs, weighted 1.0 / 0.7 / 0.4)
  FDR 1 (easy)  →  +30 pts
  FDR 5 (hard)  →  +6 pts
  DGW           →  fixture score doubled
  BGW           →  −15 pts

Availability
  Fully fit     →  +5
  ≤50% chance   →  −15
  Injured       →  −30
  Penalty taker →  +8 for first, +3 for second
```

The Groq model receives this scored data and writes reasoning in plain English.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/top-picks` | Best players by position for the current GW |
| GET | `/transfer-advice/:teamId` | Transfer suggestions + captain pick for your squad |

Full Swagger docs at `http://localhost:3000/api`
