# syntax=docker/dockerfile:1

FROM node:25-alpine

WORKDIR /app

RUN chown node:node /app

USER node

# Install dependencies first so subsequent source-only changes keep this layer cached.
COPY --chown=node:node package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Source files. `tsconfig.json` is required at runtime because the entry point is executed via
# `tsx`, which reads it for path resolution and emit-free type stripping.
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src ./src

ENV NODE_ENV=production

EXPOSE 8080

# `serve` is the HTTP/OAuth transport. To run the stdio transport instead, override the command:
#   docker run ... ghcr.io/nialtoservices/freescout-mcp stdio --freescout-user-email=...
ENTRYPOINT ["node", "--import", "tsx", "src/index.ts"]

CMD ["serve"]
