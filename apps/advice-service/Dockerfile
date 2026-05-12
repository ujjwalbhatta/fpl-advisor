FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json tsconfig.json ./
COPY prisma ./prisma
COPY apps ./apps
COPY libs ./libs

RUN npm install
RUN npm run db:generate
RUN npm run build:advice

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production

CMD ["node", "dist/apps/advice-service/main.js"]
