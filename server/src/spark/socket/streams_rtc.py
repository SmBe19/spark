from functools import wraps

from flask import current_app, request
from flask_socketio import emit

from spark import sfu
from spark.db.rooms import get_room, is_room_owner, validate_room_access
from spark.decorators import is_logged_in


class _SocketError(Exception):
    """Validation failure that should be returned as an error response."""


def add_socket_routes(socketio):
    sfu_sessions = {}
    sfu_sessions_by_socket = {}
    publications = {}
    publish_attempts = {}
    subscriptions_by_room = {}

    def _handler(event):
        """Register a handler, turning ``_SocketError`` into an error response."""

        def decorator(func):
            @socketio.on(event)
            @wraps(func)
            def wrapper(*args, **kwargs):
                try:
                    return func(*args, **kwargs)
                except _SocketError as error:
                    return {"success": False, "error": str(error)}

            return wrapper

        return decorator

    def _log_sfu_error(message, error):
        current_app.logger.warning("%s: %s", message, error)

    def _check_error(response):
        error = None
        if not isinstance(response, dict):
            error = "Unexpected response from Cloudflare SFU."
        if response.get("errorCode"):
            error = response.get("errorDescription") or response.get("errorCode")
        if error:
            raise sfu.SfuError(error)
        return response

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

    def _check_track_error(track):
        error = None
        if not track:
            error = "Cloudflare SFU did not return the requested track."
        if track.get("errorCode"):
            error = track.get("errorDescription") or track.get("errorCode")
        if error:
            raise sfu.SfuError(error)
        return track

    def _create_session():
        response = _check_error(sfu.create_session())
        session_id = response.get("sessionId")
        if not session_id:
            raise sfu.SfuError("Cloudflare SFU did not return a session ID.")
        return session_id

    def _add_tracks(session_id, payload):
        response = _check_error(sfu.add_tracks(session_id, payload))
        track = _check_track_error(_first_track(response))
        session_description = _session_description(response)
        if session_description is None:
            raise sfu.SfuError("Cloudflare SFU did not return a session description.")
        return track, session_description

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

    def _is_stream_active(room, stream_id):
        if room is None or room.get("active_mode") != "stream":
            return False
        stream_config = room.get("stream", {})
        return bool(
            stream_config.get("active_stream_id") == stream_id
            and stream_config.get("webrtc_streaming", False)
        )

    def _can_subscribe(room):
        stream_config = room.get("stream", {})
        return stream_config.get("stream_to_clients", False) or is_room_owner(room)

    def _publisher_session(data):
        session_id = data.get("session_id")
        session = sfu_sessions.get(session_id)
        if (
            session is None
            or session.get("role") != "publisher"
            or session.get("sid") != request.sid
        ):
            raise _SocketError("Unknown publishing session.")
        return session, session_id

    def _subscriber_session(sid, room_id):
        """Return the socket's live subscriber session for ``room_id``, if any.

        Subscriber sessions for other rooms are closed, since a socket only
        subscribes to the room it is currently in.
        """
        for session_id in list(sfu_sessions_by_socket.get(sid, set())):
            session = sfu_sessions.get(session_id)
            if session is None or session.get("role") != "subscriber":
                continue
            if session.get("room_id") == room_id:
                return session_id, session
            _close_session(session_id)
        return None, None

    def _require_session_id(data):
        session_id = data.get("session_id")
        session = sfu_sessions.get(session_id)
        if session is None or session.get("sid") != request.sid:
            raise _SocketError("Unknown SFU session.")
        return session_id

    def _require_publication(session_id, session):
        publication = publications.get(session["room_id"])
        if publication is None or publication.get("session_id") != session_id:
            _close_session(session_id)
            raise _SocketError("Publication not found.")
        return publication

    def _require_publisher_room(session_id, session, stream_id):
        room = get_room(session["room_id"])
        if room is None:
            _close_session(session_id)
            raise _SocketError("Room not found.")
        if not _is_stream_active(room, stream_id):
            _close_session(session_id)
            raise _SocketError("The stream is no longer active.")
        return room

    def _emit_stream_ready(room_id, stream_id, label):
        emit(
            "sfu_stream_ready",
            {"room_id": room_id, "stream_id": stream_id, "label": label},
            to="room:" + room_id,
            namespace="/",
        )

    @_handler("sfu_publish")
    def handle_sfu_publish(data):
        if not is_logged_in():
            raise _SocketError("Unauthorized.")

        data = data or {}
        room, error_response = validate_room_access(data.get("room_id"))
        if error_response:
            return error_response[0]

        stream_config = room.get("stream", {})
        stream_id = data.get("stream_id")
        if not stream_id or stream_config.get("active_stream_id") != stream_id:
            raise _SocketError("Only the active stream can be published.")
        if room.get("active_mode") != "stream" or not stream_config.get(
            "webrtc_streaming", False
        ):
            _close_publication(str(room["_id"]))
            raise _SocketError("WebRTC streaming is not enabled.")

        sdp = data.get("sdp")
        mid = data.get("mid")
        if not sdp or mid is None:
            raise _SocketError("Missing WebRTC offer.")

        room_id = str(room["_id"])
        _close_publication(room_id)
        publish_attempt = object()
        publish_attempts[room_id] = publish_attempt
        session_id = None
        try:
            session_id = _create_session()
            _, session_description = _add_tracks(
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
        except sfu.SfuError as error:
            _log_sfu_error("Failed to publish SFU stream", error)
            if session_id:
                _safe_close_tracks(session_id, str(mid))
            raise _SocketError(str(error))

        latest_room = get_room(room_id)
        if publish_attempts.get(
            room_id
        ) is not publish_attempt or not _is_stream_active(latest_room, stream_id):
            _safe_close_tracks(session_id, str(mid))
            raise _SocketError("The stream is no longer active.")

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

    @_handler("sfu_publish_ready")
    def handle_sfu_publish_ready(data):
        data = data or {}
        session, session_id = _publisher_session(data)
        _require_publisher_room(session_id, session, session.get("stream_id"))

        publication = _require_publication(session_id, session)
        publication["ready"] = True
        _emit_stream_ready(
            session["room_id"], session["stream_id"], publication.get("label", "")
        )
        return {"success": True, "data": {}}

    @_handler("sfu_switch_stream")
    def handle_sfu_switch_stream(data):
        data = data or {}
        session, session_id = _publisher_session(data)

        stream_id = data.get("stream_id")
        _require_publisher_room(session_id, session, stream_id)

        publication = _require_publication(session_id, session)
        publication["stream_id"] = stream_id
        publication["label"] = data.get("label", publication.get("label", ""))
        session["stream_id"] = stream_id
        _emit_stream_ready(session["room_id"], stream_id, publication.get("label", ""))
        return {"success": True, "data": {}}

    @_handler("sfu_subscribe")
    def handle_sfu_subscribe(data):
        data = data or {}
        room = get_room(data.get("room_id"))
        if room is None:
            raise _SocketError("Room not found.")

        room_id = str(room["_id"])
        stream_config = room.get("stream", {})
        stream_id = data.get("stream_id")
        if not stream_id or stream_config.get("active_stream_id") != stream_id:
            _close_socket_sessions(request.sid, role="subscriber")
            raise _SocketError("Only the active stream can be subscribed to.")
        if room.get("active_mode") != "stream" or not stream_config.get(
            "webrtc_streaming", False
        ):
            _close_socket_sessions(request.sid, role="subscriber")
            _close_publication(room_id)
            raise _SocketError("WebRTC streaming is not enabled.")
        if not _can_subscribe(room):
            _close_socket_sessions(request.sid, role="subscriber")
            raise _SocketError("WebRTC streaming is not enabled for clients.")

        publication = publications.get(room_id)
        if (
            publication is None
            or publication.get("stream_id") != stream_id
            or not publication.get("ready")
        ):
            _close_socket_sessions(request.sid, role="subscriber")
            raise _SocketError("not_ready")

        # Reuse an existing subscriber session for this socket and room so the
        # client can keep its PeerConnection and only renegotiate the media.
        session_id, existing_session = _subscriber_session(request.sid, room_id)
        created_session = session_id is None
        try:
            if created_session:
                session_id = _create_session()
            track, session_description = _add_tracks(
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
            mid = track.get("mid")
            if not mid:
                raise sfu.SfuError(
                    "Cloudflare SFU did not return the subscribed track mid."
                )
            # Subscribing to a new publication in the same room: drop the
            # track that carried the previous publication.
            if existing_session is not None:
                old_mid = existing_session.get("mid")
                if old_mid and old_mid != str(mid):
                    _safe_close_tracks(session_id, old_mid)
        except sfu.SfuError as error:
            _log_sfu_error("Failed to subscribe to SFU stream", error)
            if created_session and session_id:
                _safe_close_tracks(session_id, None)
            raise _SocketError(str(error))

        latest_room = get_room(room_id)
        latest_publication = publications.get(room_id)
        if (
            not _is_stream_active(latest_room, stream_id)
            or not _can_subscribe(latest_room)
            or latest_publication is None
            or latest_publication.get("session_id") != publication["session_id"]
            or not latest_publication.get("ready")
        ):
            _safe_close_tracks(session_id, str(mid))
            raise _SocketError("not_ready")

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

    @_handler("sfu_renegotiate")
    def handle_sfu_renegotiate(data):
        data = data or {}
        session_id = _require_session_id(data)
        sdp = data.get("sdp")
        if not sdp:
            raise _SocketError("Missing WebRTC answer.")

        try:
            _check_error(sfu.renegotiate(session_id, sdp))
        except sfu.SfuError as error:
            _log_sfu_error("Failed to renegotiate SFU session", error)
            raise _SocketError(str(error))
        return {"success": True, "data": {}}

    @_handler("sfu_close")
    def handle_sfu_close(data):
        data = data or {}
        session_id = data.get("session_id")
        if session_id:
            _require_session_id(data)
            _close_session(session_id)
        else:
            _close_socket_sessions(request.sid)
        return {"success": True, "data": {}}

    @_handler("disconnect")
    def handle_disconnect():
        _close_socket_sessions(request.sid)
