# FPL Transfer Advisor

An API that gives you intelligent Fantasy Premier League transfer suggestions powered by Claude AI.

You give it your FPL team ID, it tells you who to transfer in and out — and actually explains why.

## What it does

- Pulls player, team and fixture data from the FPL public API every hour
- Stores everything in Postgres, caches in Redis
- Exposes two endpoints:
  - `GET /top-picks` — best players to pick up this gameweek
  - `GET /transfer-advice/:teamId` — transfer suggestions for your specific squad

## Stack

NestJS · TypeScript · PostgreSQL · Prisma · Redis · Kafka · Anthropic Claude

## Running locally

```bash
# start the databases
docker-compose up -d

# push schema to postgres
npm run db:push

# start the sync service (pulls FPL data into DB)
npm run start:fpl-sync

# start the API
npm run start:api-gateway
```

Copy `.env.example` to `.env` and fill in your `ANTHROPIC_API_KEY`.

## Services

| Service | Port | What it does |
|---|---|---|
| api-gateway | 3000 | Public HTTP endpoints |
| fpl-sync-service | 3001 | Pulls FPL data on a schedule |
| advice-service | 3002 | AI reasoning via Claude |
| event-consumer | — | Kafka consumer for cache invalidation |

## Status

Work in progress. Sync service is done. Advice service and API gateway coming next.
