import os
import subprocess

from flask import Flask, request, send_from_directory, session
from flask_socketio import SocketIO

from spark.api import rooms
from spark.auth import login_user
from spark.decorators import public_route
from spark.mongo_utils import get_new_mongo_database, init_mongo_app

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
socketio = SocketIO(app)
init_mongo_app(app)

STATIC_PATH = os.path.abspath(os.getenv("SPARK_STATIC_PATH"))


@app.route("/")
@public_route
def index():
    return send_from_directory(STATIC_PATH, "index.html")


@app.route("/<path:path>")
@public_route
def static_files(path):
    if not os.path.exists(os.path.join(STATIC_PATH, path)):
        return send_from_directory(STATIC_PATH, "index.html")
    return send_from_directory(STATIC_PATH, path)


@app.route("/api/login", methods=["POST"])
@public_route
def login():
    username = request.json.get("username")
    password = request.json.get("password")
    user = login_user(get_new_mongo_database(), username, password)
    if user is not None:
        session["username"] = username
        session["user_id"] = str(user["_id"])
        return {"success": True}
    else:
        return {"success": False, "error": "Invalid credentials"}, 401


@app.route("/api/logout", methods=["POST"])
@public_route
def logout():
    session.clear()
    return {"success": True}


rooms.add_routes(app)


def debug_server():
    subprocess.call(["npm", "run", "build"], cwd="../frontend")
    socketio.run(app, debug=True, host="0.0.0.0", port=8000)


def prod_server():
    port = int(os.getenv("PORT", "8000"))
    os.execvp(
        "gunicorn",
        ["gunicorn", "-k", "gevent", "-b", f"0.0.0.0:{port}", "spark.server:app"],
    )
