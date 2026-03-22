FROM oven/bun:1-alpine

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY src ./src
COPY tsconfig.json ./

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
