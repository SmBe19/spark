from flask import current_app, request
from flask_socketio import emit

from spark import sfu
from spark.db.rooms import get_room, is_room_owner, validate_room_access
from spark.decorators import is_logged_in


def add_socket_routes(socketio):
    sfu_sessions = {}
    sfu_sessions_by_socket = {}
    publications = {}
    publish_attempts = {}
    subscriptions_by_room = {}

    def _log_sfu_error(message, error):
        current_app.logger.warning("%s: %s", message, error)

    def _response_error(response):
        if not isinstance(response, dict):
            return "Unexpected response from Cloudflare SFU."
        if response.get("errorCode"):
            return response.get("errorDescription") or response.get("errorCode")
        return None

    def _session_description(response):
        session_description = response.get("sessionDescription")
        if not isinstance(session_description, dict) or not session_description.get(
            "sdp"
        ):
            return None
        return session_description

    def _first_track(response):
        tracks = response.get("tracks") or []
        if not tracks:
            return None
        return tracks[0]

    def _track_error(track):
        if not track:
            return "Cloudflare SFU did not return the requested track."
        if track.get("errorCode"):
            return track.get("errorDescription") or track.get("errorCode")
        return None

    def _safe_close_tracks(session_id, mid):
        if not session_id or not mid:
            return
        try:
            sfu.close_tracks(session_id, [mid])
        except sfu.SfuError as error:
            _log_sfu_error("Failed to close SFU track", error)

    def _close_room_subscriptions(room_id):
        for session_id in list(subscriptions_by_room.get(room_id, set())):
            _close_session(session_id)

    def _close_session(session_id):
        session = sfu_sessions.pop(session_id, None)
        if session is None:
            return

        sid = session.get("sid")
        if sid:
            sid_sessions = sfu_sessions_by_socket.get(sid)
            if sid_sessions is not None:
                sid_sessions.discard(session_id)
                if not sid_sessions:
                    sfu_sessions_by_socket.pop(sid, None)

        room_id = session.get("room_id")
        role = session.get("role")
        if role == "publisher":
            publication = publications.get(room_id)
            if publication and publication.get("session_id") == session_id:
                publications.pop(room_id, None)
                _close_room_subscriptions(room_id)
                emit(
                    "sfu_stream_unavailable",
                    {
                        "room_id": room_id,
                        "stream_id": session.get("stream_id", ""),
                    },
                    to="room:" + room_id,
                    namespace="/",
                )
        elif role == "subscriber":
            room_subscriptions = subscriptions_by_room.get(room_id)
            if room_subscriptions is not None:
                room_subscriptions.discard(session_id)
                if not room_subscriptions:
                    subscriptions_by_room.pop(room_id, None)

        _safe_close_tracks(session_id, session.get("mid"))

    def _close_publication(room_id):
        publication = publications.get(room_id)
        if publication is not None:
            _close_session(publication["session_id"])

    def _close_socket_sessions(sid, role=None):
        for session_id in list(sfu_sessions_by_socket.get(sid, set())):
            session = sfu_sessions.get(session_id)
            if session is not None and (role is None or session.get("role") == role):
                _close_session(session_id)

    def _register_session(session_id, sid, role, room_id, stream_id, mid):
        sfu_sessions[session_id] = {
            "sid": sid,
            "role": role,
            "room_id": room_id,
            "stream_id": stream_id,
            "mid": mid,
        }
        sfu_sessions_by_socket.setdefault(sid, set()).add(session_id)

    @socketio.on("sfu_publish")
    def handle_sfu_publish(data):
        if not is_logged_in():
            return {"success": False, "error": "Unauthorized."}

        data = data or {}
        room, error_response = validate_room_access(data.get("room_id"))
        if error_response:
            return error_response[0]

        stream_config = room.get("stream", {})
        stream_id = data.get("stream_id")
        if not stream_id or stream_config.get("active_stream_id") != stream_id:
            return {
                "success": False,
                "error": "Only the active stream can be published.",
            }
        if room.get("active_mode") != "stream" or not stream_config.get(
            "webrtc_streaming", False
        ):
            _close_publication(str(room["_id"]))
            return {
                "success": False,
                "error": "WebRTC streaming is not enabled.",
            }

        sdp = data.get("sdp")
        mid = data.get("mid")
        if not sdp or mid is None:
            return {"success": False, "error": "Missing WebRTC offer."}

        room_id = str(room["_id"])
        _close_publication(room_id)
        publish_attempt = object()
        publish_attempts[room_id] = publish_attempt
        session_id = None
        try:
            session_response = sfu.create_session()
            session_error = _response_error(session_response)
            if session_error:
                raise sfu.SfuError(session_error)
            session_id = session_response.get("sessionId")
            if not session_id:
                raise sfu.SfuError("Cloudflare SFU did not return a session ID.")

            tracks_response = sfu.add_tracks(
                session_id,
                {
                    "sessionDescription": {"type": "offer", "sdp": sdp},
                    "tracks": [
                        {
                            "location": "local",
                            "mid": str(mid),
                            "trackName": stream_id,
                        }
                    ],
                },
            )
            tracks_error = _response_error(tracks_response)
            if tracks_error:
                raise sfu.SfuError(tracks_error)
            track = _first_track(tracks_response)
            track_error = _track_error(track)
            if track_error:
                raise sfu.SfuError(track_error)
            session_description = _session_description(tracks_response)
            if session_description is None:
                raise sfu.SfuError(
                    "Cloudflare SFU did not return a session description."
                )
        except sfu.SfuError as error:
            _log_sfu_error("Failed to publish SFU stream", error)
            if session_id:
                _safe_close_tracks(session_id, str(mid))
            return {"success": False, "error": str(error)}

        latest_room = get_room(room_id)
        latest_stream = latest_room.get("stream", {}) if latest_room else {}
        if (
            publish_attempts.get(room_id) is not publish_attempt
            or latest_room is None
            or latest_room.get("active_mode") != "stream"
            or latest_stream.get("active_stream_id") != stream_id
            or not latest_stream.get("webrtc_streaming", False)
        ):
            _safe_close_tracks(session_id, str(mid))
            return {"success": False, "error": "The stream is no longer active."}

        _register_session(
            session_id,
            request.sid,
            "publisher",
            room_id,
            stream_id,
            str(mid),
        )
        publications[room_id] = {
            "session_id": session_id,
            "stream_id": stream_id,
            "track_name": stream_id,
            "mid": str(mid),
            "label": data.get("label", ""),
            "ready": False,
        }
        return {
            "success": True,
            "data": {
                "sessionId": session_id,
                "sessionDescription": session_description,
                "trackName": stream_id,
                "mid": str(mid),
            },
        }

    @socketio.on("sfu_publish_ready")
    def handle_sfu_publish_ready(data):
        data = data or {}
        session_id = data.get("session_id")
        session = sfu_sessions.get(session_id)
        if (
            session is None
            or session.get("role") != "publisher"
            or session.get("sid") != request.sid
        ):
            return {"success": False, "error": "Unknown publishing session."}

        room = get_room(session["room_id"])
        if room is None:
            _close_session(session_id)
            return {"success": False, "error": "Room not found."}

        stream_config = room.get("stream", {})
        if (
            room.get("active_mode") != "stream"
            or stream_config.get("active_stream_id") != session.get("stream_id")
            or not stream_config.get("webrtc_streaming", False)
        ):
            _close_session(session_id)
            return {"success": False, "error": "The stream is no longer active."}

        publication = publications.get(session["room_id"])
        if publication is None or publication.get("session_id") != session_id:
            _close_session(session_id)
            return {"success": False, "error": "Publication not found."}

        publication["ready"] = True
        emit(
            "sfu_stream_ready",
            {
                "room_id": session["room_id"],
                "stream_id": session["stream_id"],
                "label": publication.get("label", ""),
            },
            to="room:" + session["room_id"],
            namespace="/",
        )
        return {"success": True, "data": {}}

    @socketio.on("sfu_switch_stream")
    def handle_sfu_switch_stream(data):
        data = data or {}
        session_id = data.get("session_id")
        session = sfu_sessions.get(session_id)
        if (
            session is None
            or session.get("role") != "publisher"
            or session.get("sid") != request.sid
        ):
            return {"success": False, "error": "Unknown publishing session."}

        stream_id = data.get("stream_id")
        room = get_room(session["room_id"])
        if room is None:
            _close_session(session_id)
            return {"success": False, "error": "Room not found."}

        stream_config = room.get("stream", {})
        if (
            room.get("active_mode") != "stream"
            or stream_config.get("active_stream_id") != stream_id
            or not stream_config.get("webrtc_streaming", False)
        ):
            _close_session(session_id)
            return {"success": False, "error": "The stream is no longer active."}

        publication = publications.get(session["room_id"])
        if publication is None or publication.get("session_id") != session_id:
            _close_session(session_id)
            return {"success": False, "error": "Publication not found."}

        publication["stream_id"] = stream_id
        publication["label"] = data.get("label", publication.get("label", ""))
        session["stream_id"] = stream_id
        emit(
            "sfu_stream_ready",
            {
                "room_id": session["room_id"],
                "stream_id": stream_id,
                "label": publication.get("label", ""),
            },
            to="room:" + session["room_id"],
            namespace="/",
        )
        return {"success": True, "data": {}}

    @socketio.on("sfu_subscribe")
    def handle_sfu_subscribe(data):
        data = data or {}
        room = get_room(data.get("room_id"))
        if room is None:
            return {"success": False, "error": "Room not found."}

        room_id = str(room["_id"])
        stream_config = room.get("stream", {})
        stream_id = data.get("stream_id")
        if not stream_id or stream_config.get("active_stream_id") != stream_id:
            _close_socket_sessions(request.sid, role="subscriber")
            return {
                "success": False,
                "error": "Only the active stream can be subscribed to.",
            }
        if room.get("active_mode") != "stream" or not stream_config.get(
            "webrtc_streaming", False
        ):
            _close_socket_sessions(request.sid, role="subscriber")
            _close_publication(room_id)
            return {
                "success": False,
                "error": "WebRTC streaming is not enabled.",
            }
        if not stream_config.get("stream_to_clients", False) and not is_room_owner(
            room
        ):
            _close_socket_sessions(request.sid, role="subscriber")
            return {
                "success": False,
                "error": "WebRTC streaming is not enabled for clients.",
            }

        _close_socket_sessions(request.sid, role="subscriber")
        publication = publications.get(room_id)
        if (
            publication is None
            or publication.get("stream_id") != stream_id
            or not publication.get("ready")
        ):
            return {"success": False, "error": "not_ready"}

        session_id = None
        try:
            session_response = sfu.create_session()
            session_error = _response_error(session_response)
            if session_error:
                raise sfu.SfuError(session_error)
            session_id = session_response.get("sessionId")
            if not session_id:
                raise sfu.SfuError("Cloudflare SFU did not return a session ID.")

            tracks_response = sfu.add_tracks(
                session_id,
                {
                    "tracks": [
                        {
                            "location": "remote",
                            "sessionId": publication["session_id"],
                            "trackName": publication["track_name"],
                        }
                    ]
                },
            )
            tracks_error = _response_error(tracks_response)
            if tracks_error:
                raise sfu.SfuError(tracks_error)
            track = _first_track(tracks_response)
            track_error = _track_error(track)
            if track_error:
                raise sfu.SfuError(track_error)
            mid = track.get("mid")
            if not mid:
                raise sfu.SfuError(
                    "Cloudflare SFU did not return the subscribed track mid."
                )
            session_description = _session_description(tracks_response)
            if session_description is None:
                raise sfu.SfuError(
                    "Cloudflare SFU did not return a session description."
                )
        except sfu.SfuError as error:
            _log_sfu_error("Failed to subscribe to SFU stream", error)
            if session_id:
                _safe_close_tracks(session_id, None)
            return {"success": False, "error": str(error)}

        latest_room = get_room(room_id)
        latest_stream = latest_room.get("stream", {}) if latest_room else {}
        latest_publication = publications.get(room_id)
        if (
            latest_room is None
            or latest_room.get("active_mode") != "stream"
            or latest_stream.get("active_stream_id") != stream_id
            or not latest_stream.get("webrtc_streaming", False)
            or (
                not latest_stream.get("stream_to_clients", False)
                and not is_room_owner(latest_room)
            )
            or latest_publication is None
            or latest_publication.get("session_id") != publication["session_id"]
            or not latest_publication.get("ready")
        ):
            _safe_close_tracks(session_id, str(mid))
            return {"success": False, "error": "not_ready"}

        _register_session(
            session_id,
            request.sid,
            "subscriber",
            room_id,
            stream_id,
            str(mid),
        )
        subscriptions_by_room.setdefault(room_id, set()).add(session_id)
        return {
            "success": True,
            "data": {
                "sessionId": session_id,
                "sessionDescription": session_description,
                "streamId": stream_id,
                "mid": str(mid),
            },
        }

    @socketio.on("sfu_renegotiate")
    def handle_sfu_renegotiate(data):
        data = data or {}
        session_id = data.get("session_id")
        session = sfu_sessions.get(session_id)
        if session is None or session.get("sid") != request.sid:
            return {"success": False, "error": "Unknown SFU session."}
        sdp = data.get("sdp")
        if not sdp:
            return {"success": False, "error": "Missing WebRTC answer."}

        try:
            response = sfu.renegotiate(session_id, sdp)
            response_error = _response_error(response)
            if response_error:
                raise sfu.SfuError(response_error)
        except sfu.SfuError as error:
            _log_sfu_error("Failed to renegotiate SFU session", error)
            return {"success": False, "error": str(error)}
        return {"success": True, "data": {}}

    @socketio.on("sfu_close")
    def handle_sfu_close(data):
        data = data or {}
        session_id = data.get("session_id")
        if session_id:
            session = sfu_sessions.get(session_id)
            if session is None or session.get("sid") != request.sid:
                return {"success": False, "error": "Unknown SFU session."}
            _close_session(session_id)
        else:
            _close_socket_sessions(request.sid)
        return {"success": True, "data": {}}

    @socketio.on("disconnect")
    def handle_disconnect():
        _close_socket_sessions(request.sid)
