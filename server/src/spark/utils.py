from flask import session
from pymongo import ObjectId


def sanitize_object(obj, keys):
    return {k: obj[k] for k in keys if k in obj}


def get_user_id():
    return ObjectId(session["user_id"])
