from spark.mongo_utils import get_mongo_database

def run_server():
    print("Hi")
    db = get_mongo_database()
    users = list(db["users"].find())
    print("Users in the database:", users)
    db.client.close()
