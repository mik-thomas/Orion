# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build
WORKDIR /app

ARG VITE_API_URL
ARG RAILWAY_GIT_COMMIT_SHA
ENV VITE_API_URL=${VITE_API_URL:-https://orion-production-7f9f.up.railway.app}
ENV VITE_APP_BUILD=${RAILWAY_GIT_COMMIT_SHA:-local}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && \
    mkdir -p dist/assets && \
    cp -R node_modules/govuk-frontend/dist/govuk/assets/. dist/assets/

FROM node:20-bookworm-slim AS run
WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]
