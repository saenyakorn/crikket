FROM oven/bun:1.3.13-alpine AS base

WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json biome.jsonc ./
COPY apps ./apps
COPY packages ./packages
COPY sdks ./sdks

FROM base AS deps

RUN bun install --frozen-lockfile

FROM deps AS build

RUN bun run --filter server build

FROM oven/bun:1.3.13-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist

EXPOSE 3000

CMD ["bun", "/app/apps/server/dist/index.mjs"]
