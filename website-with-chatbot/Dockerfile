FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy static files
COPY index.html ./
COPY admin.html ./
COPY admin-dashboard.html admin-login.html ./
COPY css/ ./css/
COPY js/ ./js/

# Copy server
COPY server/ ./server/
RUN mkdir -p /app/runtime /app/uploads && chown -R node:node /app/runtime /app/uploads
ENV DB_PATH=/app/runtime/byd.sqlite UPLOAD_DIR=/app/uploads
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server/index.js"]
