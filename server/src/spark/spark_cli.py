import argparse

from spark.auth import add_user
from spark.mongo_utils import get_new_mongo_database


def cli_add_user():
    parser = argparse.ArgumentParser(description="Add a new user to the database.")
    parser.add_argument("username", type=str, help="The username of the new user.")
    parser.add_argument("--password", type=str, help="The password for the new user.")
    args = parser.parse_args()

    password = args.password
    if password is None:
        import getpass

        password = getpass.getpass(prompt="Password: ")

    db = get_new_mongo_database()
    success, error_message = add_user(db, args.username, password)
    db.client.close()
    if success:
        print(f"User '{args.username}' added successfully.")
    else:
        print(f"Error adding user '{args.username}': {error_message}")


def cli_list_users():
    db = get_new_mongo_database()
    users = db["users"].find()
    print("Users:")
    for user in users:
        print(f"- {user['username']}")
    db.client.close()
