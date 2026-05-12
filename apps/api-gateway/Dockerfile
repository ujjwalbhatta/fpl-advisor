FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json tsconfig.json ./
COPY apps ./apps
COPY libs ./libs

RUN npm install
RUN npm run build:api-gateway

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

CMD ["node", "dist/apps/api-gateway/main.js"]
