from bson import ObjectId
from flask import session


def sanitize_object(obj, keys):
    return {k: obj[k] for k in keys if k in obj}


def validate_not_empty(obj, keys):
    for key in keys:
        if key in obj and not obj[key]:
            return False
    return True


def get_user_id():
    return ObjectId(session["user_id"])
