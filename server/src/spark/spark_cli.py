import argparse
import argon2

from spark.mongo_utils import get_mongo_database

def add_user():
    parser = argparse.ArgumentParser(description="Add a new user to the database.")
    parser.add_argument("username", type=str, help="The username of the new user.")
    parser.add_argument("--password", type=str, help="The password for the new user.")
    args = parser.parse_args()

    password = args.password
    if password is None:
        import getpass
        password = getpass.getpass(prompt="Password: ")
    password_hash = argon2.PasswordHasher().hash(password)

    db = get_mongo_database()
    users_collection = db["users"]
    existing_user = users_collection.find_one({"username": args.username})
    if existing_user:
        print(f"User '{args.username}' already exists.")
    else:
        users_collection.insert_one({"username": args.username, "password_hash": password_hash})
        print(f"User '{args.username}' added successfully.")
    db.client.close()
