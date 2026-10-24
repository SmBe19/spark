# Spark Server
This is the server part of Spark.

## Development Environment
In `../spark_devenv` you can run `docker compose up -d` to start a debug mongodb instance.

## Running
To start the server, run `uv run spark`.

## Formatter/Linter
Run `uv run ruff format` to format the code.

Run `uv run ruff check --fix` to run the linter and fix some findings automatically.