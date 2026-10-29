FROM node:24-alpine AS frontend_build

COPY frontend /frontend
WORKDIR /frontend
RUN npm ci && npm run build --production

FROM ghcr.io/astral-sh/uv:python3.13-alpine

COPY --from=frontend_build /frontend/dist/spark_frontend/browser /app/frontend
ENV SPARK_STATIC_PATH=/app/frontend

COPY server/ /app/server
WORKDIR /app/server
RUN uv build

CMD ["uv", "run", "prod_server"]
