from bson import ObjectId
from flask_socketio import emit

from spark.db.mongo_utils import get_mongo_database
from spark.utils import get_user_id


def add_socket_routes(socketio):

    @socketio.on("add_stream_preview_frame")
    def handle_add_stream_preview_frame(data):
        db = get_mongo_database()
        room = db["rooms"].find_one({"_id": ObjectId(data["room_id"])})
        if room is None:
            return {"success": False, "error": "Room not found."}
        if room.get("owner_id") != get_user_id():
            return {"success": False, "error": "Unauthorized access."}
        stream_config = room.get("stream", {})
        need_big_frame = stream_config.get("active_stream_id") == data[
            "stream_id"
        ] and not stream_config.get("webrtc_streaming", False)
        emit(
            "stream_preview_frame",
            {
                "id": data["stream_id"],
                "label": data["label"],
                "current_frame": data["current_frame"],
            },
            to="room-admin:" + str(room["_id"]),
            namespace="/",
        )
        return {"success": True, "data": {"need_big_frame": need_big_frame}}
