# Spark Server
This is the server part of Spark.

## Development Environment
In `../spark_devenv` you can run `docker compose up -d` to start a debug mongodb instance.

## Running
To start the server, run `uv run spark`.

## Frontend assets in production

The Flask server compresses eligible frontend responses and caches content-hashed assets for one year. The SPA entry point and unversioned files must still be revalidated. For higher traffic deployments, serve `SPARK_STATIC_PATH` directly from a reverse proxy or CDN with the same compression, cache policy, and SPA fallback. Keep `/api/` and `/socket.io/` routed to the application server.

## Formatter/Linter
Run `uv run ruff format` to format the code.

Run `uv run ruff check --fix` to run the linter and fix some findings automatically.