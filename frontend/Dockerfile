# vitest 5 が Node 22.12 以上を要求するため 22 系を使う
FROM node:22-alpine

WORKDIR /app

# 起動時に entrypoint が /app/dist/env-config.js を書き込むため、/app を node ユーザーの所有にする
RUN chown node:node /app

# Copy entrypoint script
COPY --chmod=755 scripts/docker-entrypoint.sh /usr/local/bin/

# 以降は非 root で実行する
USER node

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY --chown=node:node . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

# Use entrypoint script to generate runtime env config
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application with correct host and port
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
