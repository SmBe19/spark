import os

import pymongo
from flask import g


def get_mongo_database():
    if "mongo_db" not in g:
        g.mongo_db = get_new_mongo_database()
    return g.mongo_db


def close_mongo_database(e=None):
    mongo_db = g.pop("mongo_db", None)
    if mongo_db is not None:
        mongo_db.client.close()


def init_mongo_app(app):
    app.teardown_appcontext(close_mongo_database)


def get_new_mongo_database():
    uri = os.getenv("MONGO_URL")
    client = pymongo.MongoClient(uri)
    db = client.get_database()
    return db


def ping_mongo():
    db = get_new_mongo_database()
    try:
        db.command("ping")
        print("Successfully connected to MongoDB.")
    except Exception as e:  # noqa: BLE001
        print(f"Failed to connect to MongoDB: {e}")
    finally:
        db.client.close()
