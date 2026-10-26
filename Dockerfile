# LPIC-1 Trainer — static learning site + tiny Node server with SQLite persistence
FROM node:22-alpine

ENV NODE_ENV=production \
    PORT=8080 \
    DB_PATH=/data/lpic1.db

WORKDIR /app
COPY package.json server.js index.html ./
COPY assets ./assets

RUN mkdir -p /data && chown -R node:node /data
USER node

VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
