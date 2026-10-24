from functools import wraps

from flask import session


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return {"success": False, "error": "Unauthorized"}, 401
        return f(*args, **kwargs)

    return decorated_function


def public_route(f):
    """Decorator to mark a route as public (no authentication required)."""
    return f
