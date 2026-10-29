from bson import ObjectId

from spark.db.rooms import db_archive_poll_for_room
from spark.decorators import login_required
from spark.db.mongo_utils import get_mongo_database
from spark.utils import sanitize_object


def add_routes(app):

    @app.route("/api/rooms/<room_id>/archived_polls", methods=["GET"])
    @login_required
    def get_archived_polls_for_room(room_id):
        db = get_mongo_database()
        archived_polls = db["archived_polls"].find({"room_id": ObjectId(room_id)})
        return {
            "success": True,
            "data": [sanitize_archived_poll_short(poll) for poll in archived_polls],
        }

    @app.route("/api/archived_polls/<poll_id>", methods=["GET"])
    @login_required
    def get_archived_poll(poll_id):
        db = get_mongo_database()
        poll = db["archived_polls"].find_one({"_id": ObjectId(poll_id)})
        if poll is None:
            return {"success": False, "error": "Archived poll not found."}, 404
        return {"success": True, "data": sanitize_archived_poll(poll)}

    @app.route("/api/rooms/<room_id>/archive_poll", methods=["POST"])
    @login_required
    def archive_poll_for_room(room_id):
        return db_archive_poll_for_room(room_id)

    @app.route("/api/archived_polls/<poll_id>", methods=["DELETE"])
    @login_required
    def delete_archived_poll(poll_id):
        db = get_mongo_database()
        result = db["archived_polls"].delete_one({"_id": ObjectId(poll_id)})
        if result.deleted_count > 0:
            return {"success": True}
        else:
            return {"success": False, "error": "Archived poll not found."}, 404

    def sanitize_archived_poll_short(poll):
        san = sanitize_object(poll, ["archived_at", "poll"])
        san["id"] = str(poll["_id"])
        san["room_id"] = str(poll["room_id"])
        return san

    def sanitize_archived_poll(poll):
        san = sanitize_object(poll, ["archived_at", "poll", "answers"])
        san["id"] = str(poll["_id"])
        san["room_id"] = str(poll["room_id"])
        return san
