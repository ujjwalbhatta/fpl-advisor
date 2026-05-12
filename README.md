# FPL Transfer Advisor

An AI-powered Fantasy Premier League assistant API. Give it your FPL team ID and it returns transfer suggestions with written reasoning not only with a score, but why.

Built as a production-style monorepo to demonstrate event-driven architecture, Redis caching, Kafka messaging, scheduled data pipelines, and Groq AI reasoning.

## Architecture

[FPL Public API]
      │
      ▼  every hour via @Cron
[fpl-sync-service]          pulls players, fixtures, teams → PostgreSQL
      │                     detects price/injury changes
      ▼
[Kafka]                     fpl.player.price-changed
      │                     fpl.player.injury-updated
      ▼
[event-consumer]            invalidates Redis cache on change

[api-gateway] :3000         public HTTP entry point
      │
      ▼
[advice-service] :3002      scoring algorithm + Groq AI reasoning
      │
      ├── GET /top-picks
      └── GET /transfer-advice/:teamId


## Stack
Framework | NestJS + TypeScript 
Database | PostgreSQL via Prisma ORM
Cache | Redis 
Messaging | Kafka 
Scheduler | @nestjs/schedule 
AI | Groq (llama-3.3-70b) 
Infra | Docker Compose 

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone <repo-url>
cd fpl-advisor
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your values:

```bash
DATABASE_URL=postgresql://fpl:fpl@localhost:5432/fpl_advisor
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9093
KAFKA_GROUP_ID=fpl-advisor-group
GROQ_API_KEY=your_groq_api_key        # free at console.groq.com
ADVICE_SERVICE_PORT=3002
ADVICE_SERVICE_URL=http://localhost:3002
FPL_BASE_URL=https://fantasy.premierleague.com/api
```

### 3. Start infrastructure
docker-compose up -d


### 4. Apply database schema
npm run db:generate
npm run db:push

### 5. Run services (4 terminals)

```bash
# Terminal 1 — syncs FPL data to DB, runs cron jobs
npm run start:fpl-sync

# Terminal 2 — Kafka consumer, invalidates Redis on changes
npm run start:consumer

# Terminal 3 — AI reasoning layer
npm run start:advice

# Terminal 4 — public API
npm run start:api-gateway
```

Wait for `fpl-sync` to log `Synced X players and Y fixtures` before hitting the endpoints.

---

## API

Swagger UI available at `http://localhost:3000/api`

## Project Structure

```
fpl-advisor/
├── apps/
│   ├── api-gateway/          public HTTP entry point (port 3000)
│   ├── advice-service/       scoring + AI reasoning (port 3002)
│   ├── fpl-sync-service/     FPL API poller + Kafka producer
│   └── event-consumer/       Kafka consumer, Redis cache invalidation
├── libs/
│   ├── database/             PrismaService, DatabaseModule
│   ├── redis/                CacheService, RedisModule
│   └── shared-types/         shared interfaces and Kafka event types
├── prisma/schema.prisma
├── docker-compose.yml
└── .github/workflows/ci.yml
```
---

## Scoring Algorithm

Each player gets a numeric score used to rank top picks and identify weak squad spots:

```
form × 3              capped at 30
fixture difficulty    FDR 1 = easy (+30 pts), FDR 5 = hard (+6 pts)
                      weighted across next 3 GWs (1.0 / 0.7 / 0.4)
DGW bonus             fixture score doubled for double gameweeks
BGW penalty           −15 for blank gameweeks
availability          +5 if fully fit, −15 if ≤50% chance, −30 if injured
```

The AI receives this scored data and writes the reasoning, citing specific fixture names, form numbers, and FDR values rather than just returning a number.
