FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs ./
COPY apps ./apps
COPY packages ./packages
COPY docs ./docs
RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @trader-paperclip/web build

FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY --from=base /app /app
EXPOSE 5173
CMD ["corepack", "pnpm", "--filter", "@trader-paperclip/web", "dev", "--host", "0.0.0.0"]
