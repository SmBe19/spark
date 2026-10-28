from bson import ObjectId
from flask_socketio import emit

from spark.mongo_utils import get_mongo_database
from spark.utils import sanitize_object


def db_add_answer_to_room(room_id, answer_content, question_index, user_hash):
    if answer_content is None or question_index is None or user_hash is None:
        return {"success": False, "error": "Missing required fields"}, 400
    db = get_mongo_database()
    room = db["rooms"].find_one({"_id": ObjectId(room_id)})
    if room is None:
        return {"success": False, "error": "Room not found."}, 404
    answer = {
        "answer": answer_content,
        "question_index": question_index,
        "user_hash": user_hash,
    }
    db["rooms"].update_one(
        {"_id": ObjectId(room_id)},
        {"$push": {"active_answers": answer}},
        upsert=True,
    )

    emit("new_answer", {"answer": answer}, to="room-admin:" + str(room["_id"]))
    return {"success": True}


def sanitize_room_short(room):
    san = sanitize_object(room, ["slug", "name"])
    san["id"] = str(room["_id"])
    return san


def sanitize_room(room):
    san = sanitize_object(
        room, ["slug", "name", "active_poll", "active_question_index"]
    )
    san["id"] = str(room["_id"])
    return san
