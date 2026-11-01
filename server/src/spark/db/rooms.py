import time

from bson import ObjectId
from flask_socketio import emit

from spark.db.mongo_utils import get_mongo_database
from spark.utils import sanitize_object


def db_add_reply_to_room(room_id, reply_content, question_index, user_hash):
    if reply_content is None or question_index is None or user_hash is None:
        return {"success": False, "error": "Missing required fields"}, 400
    db = get_mongo_database()
    room = db["rooms"].find_one({"_id": ObjectId(room_id)})
    if room is None:
        return {"success": False, "error": "Room not found."}, 404
    reply = {
        "reply": reply_content,
        "question_index": question_index,
        "user_hash": user_hash,
    }
    db["rooms"].update_one(
        {"_id": ObjectId(room_id)},
        {"$push": {"active_replies": reply}},
        upsert=True,
    )

    emit(
        "new_reply",
        {"reply": sanitize_reply(reply)},
        to="room-admin:" + str(room["_id"]),
        namespace="/",
    )
    return {"success": True}


def db_archive_poll_for_room(room_id):
    db = get_mongo_database()
    room = db["rooms"].find_one({"_id": ObjectId(room_id)})
    if room is None:
        return {"success": False, "error": "Room not found."}, 404
    if not room.get("active_poll") or not room.get("active_replies"):
        return {"success": False, "error": "No active poll to archive."}, 400
    poll = room["active_poll"]
    replies = room.get("active_replies", [])
    db["archived_polls"].insert_one(
        {
            "room_id": ObjectId(room_id),
            "archived_at": int(time.time()),
            "poll": poll,
            "replies": replies,
        }
    )
    update_values = {
        "active_poll_id": ObjectId(),
        "active_poll": "",
        "active_replies": [],
        "active_question_index": 0,
    }
    db["rooms"].update_one(
        {"_id": ObjectId(room_id)},
        {
            "$set": update_values,
        },
    )
    emit(
        "room_update",
        sanitize_room(update_values),
        to="room:" + str(room_id),
        namespace="/",
    )
    return {"success": True}


def sanitize_room_short(room):
    san = sanitize_object(room, ["slug", "name"])
    san["id"] = str(room["_id"])
    return san


def sanitize_room(room):
    san = sanitize_object(
        room,
        [
            "slug",
            "name",
            "active_poll_id",
            "active_poll",
            "active_presentation",
            "active_mode",
            "active_question_index",
        ],
    )
    san["id"] = str(room["_id"])
    san["active_poll_id"] = str(room.get("active_poll_id", ""))
    return san

def sanitize_reply(reply):
    san = sanitize_object(reply, ["reply", "question_index"])
    return san
