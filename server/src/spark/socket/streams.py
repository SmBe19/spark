from flask_socketio import emit

from spark.db.rooms import validate_room_access


def add_socket_routes(socketio):
    @socketio.on("add_stream_preview_frame")
    def handle_add_stream_preview_frame(data):
        room, error_response = validate_room_access(
            data["room_id"], accept_client_streaming=True
        )
        if error_response:
            return error_response[0]
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
