FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    PORT=8080 \
    LATCH_DATA_DIR=/tmp/latch-runs \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
ARG LATCH_INSTALL_CHROMIUM=1

# The lockfile pins Playwright. Installing its browser here keeps the runner
# package and Chromium revision in agreement without a separate image version.
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund \
    && if [ "$LATCH_INSTALL_CHROMIUM" = "1" ]; then npx playwright install --with-deps chromium; fi

COPY . .
RUN npm run build \
    && mkdir -p /app/work /app/server/data /app/data \
    && chown -R node:node /app/work /app/server/data /app/data

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "start"]
