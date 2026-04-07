FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs ./
COPY apps ./apps
COPY packages ./packages
COPY docs ./docs
RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @trader-paperclip/worker build

FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY --from=base /app /app
EXPOSE 4010
CMD ["corepack", "pnpm", "--filter", "@trader-paperclip/worker", "dev"]
