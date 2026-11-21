from bson import ObjectId
from flask import session


def sanitize_object(obj, keys):
    return {k: obj[k] for k in keys if k in obj}


def sanitize_and_prefix_object(obj, keys, prefix):
    return {f"{prefix}.{k}": obj[k] for k in keys if k in obj}


def prefixed_object_to_nested_object(obj):
    nested_obj = {}
    for key, value in obj.items():
        parts = key.split(".")
        current = nested_obj
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return nested_obj


def validate_not_empty(obj, keys):
    for key in keys:
        if key in obj and not obj[key]:
            return False
    return True


def get_user_id():
    return ObjectId(session["user_id"])
