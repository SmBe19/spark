import time

from pymongo import ObjectId

from spark.decorators import login_required
from spark.mongo_utils import get_mongo_database
from spark.utils import sanitize_object


def add_routes(app):

    @app.route("/api/rooms/<room_id>/archived_polls", methods=["GET"])
    @login_required
    def get_archived_polls_for_room(room_id):
        db = get_mongo_database()
        archived_polls = db["archived_polls"].find({"room_id": ObjectId(room_id)})
        return {
            "success": True,
            "archived_polls": [
                sanitize_archived_poll_short(poll) for poll in archived_polls
            ],
        }

    @app.route("/api/archived_polls/<poll_id>", methods=["GET"])
    @login_required
    def get_archived_poll(poll_id):
        db = get_mongo_database()
        poll = db["archived_polls"].find_one({"_id": ObjectId(poll_id)})
        if poll is None:
            return {"success": False, "error": "Archived poll not found"}, 404
        return {"success": True, "archived_poll": sanitize_archived_poll(poll)}

    @app.route("/api/rooms/<room_id>/archive_poll", methods=["POST"])
    @login_required
    def archive_poll_for_room(room_id):
        db = get_mongo_database()
        room = db["rooms"].find_one({"_id": ObjectId(room_id)})
        if room is None:
            return {"success": False, "error": "Room not found"}, 404
        if room.get("active_poll") is None:
            return {"success": False, "error": "No active poll to archive"}, 400
        poll = room["active_poll"]
        answers = room.get("active_answers", [])
        db["archived_polls"].insert_one(
            {
                "room_id": ObjectId(room_id),
                "archived_at": int(time.time()),
                "poll": poll,
                "answers": answers,
            }
        )
        db["rooms"].update_one(
            {"_id": ObjectId(room_id)},
            {
                "$set": {
                    "active_poll": None,
                    "active_answers": [],
                    "active_question_index": None,
                },
            },
        )
        return {"success": True}

    @app.route("/api/archived_polls/<poll_id>", methods=["DELETE"])
    @login_required
    def delete_archived_poll(poll_id):
        db = get_mongo_database()
        result = db["archived_polls"].delete_one({"_id": ObjectId(poll_id)})
        if result.deleted_count > 0:
            return {"success": True}
        else:
            return {"success": False, "error": "Archived poll not found"}, 404

    def sanitize_archived_poll_short(poll):
        san = sanitize_object(poll, ["_id", "archived_at", "poll"])
        san["_id"] = str(san["_id"])
        san["room_id"] = str(san["room_id"])
        return san

    def sanitize_archived_poll(poll):
        san = sanitize_object(poll, ["_id", "archived_at", "poll", "answers"])
        san["_id"] = str(san["_id"])
        san["room_id"] = str(san["room_id"])
        return san
