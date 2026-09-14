# Dockwise backend image (NestJS + TypeORM + sql.js SQLite).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN node node_modules/typescript/bin/tsc -p tsconfig.json

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
EXPOSE 3001
# DB_PATH is injected via the environment; defaults to a file inside the container.
CMD ["node", "dist/main.js"]
