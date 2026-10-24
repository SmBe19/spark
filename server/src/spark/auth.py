import argon2


def add_user(db, username, password):
    error_message = None
    password_hash = argon2.PasswordHasher().hash(password)
    users_collection = db["users"]
    existing_user = users_collection.find_one({"username": username})
    if existing_user:
        error_message = "User already exists."
    else:
        users_collection.insert_one(
            {"username": username, "password_hash": password_hash}
        )
    return error_message is None, error_message


def login_user(db, username, password):
    users_collection = db["users"]
    user = users_collection.find_one({"username": username})
    if user is None:
        return None
    password_hash = user["password_hash"]
    try:
        argon2.PasswordHasher().verify(password_hash, password)
        return user
    except argon2.exceptions.VerifyMismatchError:
        return None
