import os
import pymongo


def get_mongo_database():
    uri = os.getenv("SPARK_MONGODB_URI")
    database_name = os.getenv("SPARK_MONGODB_DBNAME")
    client = pymongo.MongoClient(uri)
    db = client[database_name]
    return db


def ping_mongo():
    db = get_mongo_database()
    try:
        db.command("ping")
        print("Successfully connected to MongoDB.")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
    finally:
        db.client.close()
