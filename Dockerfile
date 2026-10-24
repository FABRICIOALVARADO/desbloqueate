FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/assets/curriculum.json ./src/assets/curriculum.json
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "server/index.mjs"]
