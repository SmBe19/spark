from bson import ObjectId
from flask_socketio import join_room, leave_room, rooms

from spark.db.rooms import db_add_answer_to_room, sanitize_room
from spark.decorators import is_logged_in
from spark.mongo_utils import get_mongo_database


def add_socket_routes(socketio):

    @socketio.on("join_room")
    def handle_join_room(data):
        db = get_mongo_database()
        room = None
        if "slug" in data:
            room_slug = data["slug"]
            room = db["rooms"].find_one({"slug": room_slug})
        elif "room_id" in data:
            room_id = data["room_id"]
            room = db["rooms"].find_one({"_id": ObjectId(room_id)})
        if room is None:
            return {"success": False, "error": "Room not found."}
        for current_room in rooms():
            if current_room.startswith("room:"):
                leave_room(current_room)
        join_room("room:" + str(room["_id"]))
        return {"success": True, "data": sanitize_room(room)}

    @socketio.on("join_admin_room")
    def handle_join_admin_room(data):
        if not is_logged_in():
            return
        db = get_mongo_database()
        room = None
        if "slug" in data:
            room_slug = data["slug"]
            room = db["rooms"].find_one({"slug": room_slug})
        elif "room_id" in data:
            room_id = data["room_id"]
            room = db["rooms"].find_one({"_id": ObjectId(room_id)})
        if room is None:
            return {"success": False, "error": "Room not found."}
        for current_room in rooms():
            if current_room.startswith("room-admin:"):
                leave_room(current_room)
        join_room("room-admin:" + str(room["_id"]))
        return {"success": True, "data": sanitize_room(room)}

    @socketio.on("add_answer")
    def handle_add_answer(data):
        res = db_add_answer_to_room(
            data["room_id"],
            data["answer"],
            data["question_index"],
            data["user_hash"],
        )
        if isinstance(res, tuple):
            return res[0]
        return res
