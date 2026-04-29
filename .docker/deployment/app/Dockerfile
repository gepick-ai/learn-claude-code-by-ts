# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.11-slim AS base
WORKDIR /app

# Align with opencode practice: disable Bun runtime transpiler cache in containers.
ARG BUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_RUNTIME_TRANSPILER_CACHE_PATH}

RUN apt-get update && \
  apt-get install -y --no-install-recommends ca-certificates ripgrep nodejs npm && \
  rm -rf /var/lib/apt/lists/*

FROM base AS assets
WORKDIR /app

COPY --chown=bun:bun packages/app/dist /app
COPY --chown=bun:bun packages/client/dist /app/static
COPY --chown=bun:bun packages/app/migration /app/migration
COPY --chown=bun:bun packages/app/src/code/client-dev/templates /app/templates

FROM base
WORKDIR /app

COPY --from=assets --chown=bun:bun /app /app

# Ensure runtime-writeable sqlite directory exists
RUN mkdir -p .data && chown -R bun:bun /app

EXPOSE 3000

USER bun
CMD ["bun", "run", "index.js"]
