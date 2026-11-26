import time

from bson import ObjectId
from flask import Response, abort, request
from flask_socketio import emit

from spark.db.rooms import allows_client_streaming, validate_room_access
from spark.decorators import is_logged_in

BIG_FRAME_CACHE_TTL_S = 10 * 60


def add_routes(app):

    big_frame_cache = {}

    def cleanup_big_frame_cache():
        cutoff = time.time() - BIG_FRAME_CACHE_TTL_S
        for cached_stream_id, cached_frame in list(big_frame_cache.items()):
            if cached_frame["timestamp"] < cutoff:
                del big_frame_cache[cached_stream_id]

    @app.route("/api/streams/<stream_id>/bigframe/<frame_id>", methods=["GET"])
    def get_big_frame(stream_id, frame_id):
        cached_frame = big_frame_cache.get(stream_id)
        if cached_frame is None:
            abort(404)
        response = Response(cached_frame["data"], mimetype=cached_frame["content_type"])
        response.headers["Cache-Control"] = "public, max-age=86400, immutable"
        return response

    @app.route("/api/streams/<stream_id>/bigframe", methods=["POST"])
    def set_big_frame(stream_id):
        room_id = request.args.get("room_id")
        if not room_id or not ObjectId.is_valid(room_id):
            return
        room, error_response = validate_room_access(
            room_id, accept_client_streaming=True
        )
        if error_response:
            return error_response
        if not is_logged_in() and not allows_client_streaming(room):
            return {"success": False, "error": "Unauthorized"}, 401

        cleanup_big_frame_cache()

        uploaded_file = request.files.get("image")
        if uploaded_file is None and request.files:
            uploaded_file = next(iter(request.files.values()))
        if uploaded_file is not None:
            frame_data = uploaded_file.read()
            content_type = uploaded_file.mimetype or "application/octet-stream"
        else:
            frame_data = request.get_data()
            content_type = request.mimetype or "application/octet-stream"
        if not frame_data:
            return {"success": False, "error": "No image data provided."}, 400
        timestamp = time.time()
        big_frame_cache[stream_id] = {
            "data": frame_data,
            "content_type": content_type,
            "timestamp": timestamp,
        }

        frame_id = str(int(timestamp * 1000))
        stream_config = room.get("stream", {})
        target_room = "room-admin:" + str(room["_id"])
        if (
            stream_config.get("active_stream_id") == stream_id
            and stream_config.get("stream_to_clients", False)
            and not stream_config.get("webrtc_streaming", False)
        ):
            target_room = "room:" + str(room["_id"])
        emit(
            "stream_big_frame",
            {
                "id": stream_id,
                "label": request.args.get("label", ""),
                "current_frame": f"/api/streams/{stream_id}/bigframe/{frame_id}",
            },
            to=target_room,
            namespace="/",
        )

        return {"success": True, "data": {}}
