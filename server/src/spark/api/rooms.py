
from flask import request
from pymongo import ObjectId

from spark.decorators import login_required, public_route
from spark.mongo_utils import get_mongo_database
from spark.utils import get_user_id, sanitize_object


def add_routes(app):

    @app.route("/api/rooms", methods=["GET"])
    @login_required
    def get_rooms():
        db = get_mongo_database()
        rooms = db["rooms"].find({"owner_id": get_user_id()})
        return {"success": True, "rooms": [sanitize_room_short(room) for room in rooms]}

    @app.route("/api/rooms/<room_id>", methods=["GET"])
    @public_route
    def get_room(room_id):
        db = get_mongo_database()
        room = db["rooms"].find_one({"_id": ObjectId(room_id)})
        if room is None:
            return {"success": False, "error": "Room not found"}, 404
        return {"success": True, "room": sanitize_room(room)}

    @app.route("/api/rooms/slug/<room_slug>", methods=["GET"])
    @public_route
    def get_room_by_slug(room_slug):
        db = get_mongo_database()
        room = db["rooms"].find_one({"slug": room_slug})
        if room is None:
            return {"success": False, "error": "Room not found"}, 404
        return {"success": True, "room": sanitize_room(room)}

    @app.route("/api/rooms/<room_id>/answers", methods=["GET"])
    @login_required
    def get_answers_for_room(room_id):
        db = get_mongo_database()
        room = db["rooms"].find_one({"room_id": ObjectId(room_id)})
        if room is None:
            return {"success": False, "error": "Room not found"}, 404
        return {"success": True, "answers": room.get("active_answers", [])}

    @app.route("/api/rooms/<room_id>/answers", methods=["POST"])
    @public_route
    def add_answer_to_room(room_id):
        answer_content = request.json.get("answer")
        answer_index = request.json.get("index")
        user_hash = request.json.get("user_hash")
        return db_add_answer_to_room(room_id, answer_content, answer_index, user_hash)

    def db_add_answer_to_room(room_id, answer_content, answer_index, user_hash):
        if answer_content is None or answer_index is None or user_hash is None:
            return {"success": False, "error": "Missing required fields"}, 400
        db = get_mongo_database()
        room = db["rooms"].find_one({"_id": ObjectId(room_id)})
        if room is None:
            return {"success": False, "error": "Room not found"}, 404
        answer = {
            "answer": answer_content,
            "index": answer_index,
            "user_hash": user_hash,
        }
        db["rooms"].update_one(
            {"_id": ObjectId(room_id)},
            {"$push": {"active_answers": answer}},
            upsert=True,
        )
        return {"success": True}

    @app.route("/api/rooms/<room_id>", methods=["PUT"])
    @login_required
    def update_room(room_id):
        db = get_mongo_database()
        update_data = request.json
        result = db["rooms"].update_one(
            {"_id": ObjectId(room_id)},
            {
                "$set": sanitize_object(
                    update_data,
                    ["slug", "name", "active_poll", "active_question_index"],
                )
            },
        )
        if result.modified_count > 0:
            return {"success": True}
        else:
            return {"success": False, "error": "Room not found or no changes made"}, 404

    @app.route("/api/rooms/<room_id>", methods=["DELETE"])
    @login_required
    def delete_room(room_id):
        db = get_mongo_database()
        result = db["rooms"].delete_one({"_id": ObjectId(room_id)})
        if result.deleted_count > 0:
            db["archived_polls"].delete_many({"room_id": ObjectId(room_id)})
            return {"success": True}
        else:
            return {"success": False, "error": "Room not found"}, 404

    @app.route("/api/rooms", methods=["POST"])
    @login_required
    def add_room():
        db = get_mongo_database()
        room_slug = request.json.get("slug")
        room_name = request.json.get("name")
        if not room_slug or not room_name:
            return {"success": False, "error": "Room slug and name are required"}, 400
        existing_room = db["rooms"].find_one({"slug": room_slug})
        if existing_room:
            return {"success": False, "error": "Room slug already exists"}, 400
        room_id = (
            db["rooms"]
            .insert_one(
                {
                    "owner_id": get_user_id(),
                    "slug": room_slug,
                    "name": room_name,
                    "active_poll": None,
                    "active_answers": [],
                    "active_question_index": None,
                }
            )
            .inserted_id
        )
        return {"success": True, "room_id": str(room_id)}

    def sanitize_room_short(room):
        san = sanitize_object(room, ["_id", "slug", "name"])
        san["_id"] = str(san["_id"])
        return san

    def sanitize_room(room):
        san = sanitize_object(
            room, ["_id", "slug", "name", "active_poll", "active_question_index"]
        )
        san["_id"] = str(san["_id"])
        return san
