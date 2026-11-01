from bson import ObjectId
from flask import request
from flask_socketio import emit

from spark.db.mongo_utils import get_mongo_database
from spark.db.rooms import (
    db_add_reply_to_room,
    db_archive_poll_for_room,
    sanitize_reply,
    sanitize_room,
    sanitize_room_short,
)
from spark.decorators import login_required, public_route
from spark.utils import get_user_id, sanitize_object, validate_not_empty


def add_routes(app):

    @app.route("/api/rooms", methods=["GET"])
    @login_required
    def get_rooms():
        db = get_mongo_database()
        rooms = db["rooms"].find({"owner_id": get_user_id()})
        return {"success": True, "data": [sanitize_room_short(room) for room in rooms]}

    @app.route("/api/rooms/<room_id>", methods=["GET"])
    @public_route
    def get_room(room_id):
        db = get_mongo_database()
        room = db["rooms"].find_one({"_id": ObjectId(room_id)})
        if room is None:
            return {"success": False, "error": "Room not found."}, 404
        return {"success": True, "data": sanitize_room(room)}

    @app.route("/api/rooms/<room_id>/replies", methods=["GET"])
    @login_required
    def get_replies_for_room(room_id):
        db = get_mongo_database()
        room = db["rooms"].find_one({"_id": ObjectId(room_id)})
        if room is None:
            return {"success": False, "error": "Room not found."}, 404
        return {
            "success": True,
            "data": [sanitize_reply(reply) for reply in room.get("active_replies", [])],
        }

    @app.route("/api/rooms/<room_id>/replies", methods=["POST"])
    @public_route
    def add_reply_to_room(room_id):
        reply_content = request.json.get("reply")
        question_index = request.json.get("question_index")
        user_hash = request.json.get("user_hash")
        return db_add_reply_to_room(room_id, reply_content, question_index, user_hash)

    @app.route("/api/rooms/<room_id>", methods=["PUT"])
    @login_required
    def update_room(room_id):
        db = get_mongo_database()
        update_data = request.json
        if not validate_not_empty(update_data, ["slug", "name"]):
            return {"success": False, "error": "Room slug and name are required."}, 400
        if "slug" in update_data:
            update_data["slug"] = update_data["slug"].lower()
        sanitized_data = sanitize_object(
            update_data,
            [
                "slug",
                "name",
                "active_poll",
                "active_presentation",
                "active_mode",
                "active_question_index",
            ],
        )
        if (
            "active_poll" in sanitized_data
            and sanitized_data["active_poll"].strip() == ""
        ):
            db_archive_poll_for_room(room_id)
        result = db["rooms"].update_one(
            {"_id": ObjectId(room_id)},
            {"$set": sanitized_data},
        )
        if result.modified_count > 0:
            emit(
                "room_update", sanitized_data, to="room:" + str(room_id), namespace="/"
            )
        return {"success": True}

    @app.route("/api/rooms/<room_id>", methods=["DELETE"])
    @login_required
    def delete_room(room_id):
        db = get_mongo_database()
        result = db["rooms"].delete_one({"_id": ObjectId(room_id)})
        if result.deleted_count > 0:
            db["archived_polls"].delete_many({"room_id": ObjectId(room_id)})
            return {"success": True}
        else:
            return {"success": False, "error": "Room not found."}, 404

    @app.route("/api/rooms", methods=["POST"])
    @login_required
    def add_room():
        db = get_mongo_database()
        room_slug = request.json.get("slug").lower()
        room_name = request.json.get("name")
        if not room_slug or not room_name:
            return {"success": False, "error": "Room slug and name are required."}, 400
        existing_room = db["rooms"].find_one({"slug": room_slug})
        if existing_room:
            return {"success": False, "error": "Room slug already exists."}, 400
        room_id = (
            db["rooms"]
            .insert_one(
                {
                    "owner_id": get_user_id(),
                    "slug": room_slug,
                    "name": room_name,
                    "active_poll_id": ObjectId(),
                    "active_poll": "",
                    "active_presentation": "",
                    "active_mode": "poll",
                    "active_replies": [],
                    "active_question_index": 0,
                }
            )
            .inserted_id
        )
        return {"success": True, "data": {"room_id": str(room_id)}}
