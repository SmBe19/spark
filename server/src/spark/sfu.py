import json
import os
import urllib.error
import urllib.request

SFU_BASE_URL = "https://rtc.live.cloudflare.com/v1"
# Cloudflare's Browser Integrity Check rejects the default Python urllib
# User-Agent on rtc.live.cloudflare.com with error 1010, so identify the app.
SFU_USER_AGENT = "spark-sfu-backend/1.0"


class SfuError(Exception):
    def __init__(self, message, status=None, details=None):
        super().__init__(message)
        self.status = status
        self.details = details


def _request(method, path, payload=None):
    app_id = os.getenv("CF_SFU_APP_ID")
    api_token = os.getenv("CF_SFU_API_TOKEN")
    if not app_id or not api_token:
        raise SfuError("Cloudflare SFU is not configured.")

    request = urllib.request.Request(
        f"{SFU_BASE_URL}/apps/{app_id}{path}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
            "User-Agent": SFU_USER_AGENT,
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raw_response = response.read()
            if not raw_response:
                return {}
            return json.loads(raw_response)
    except urllib.error.HTTPError as error:
        raw_response = error.read()
        try:
            details = json.loads(raw_response)
        except (TypeError, ValueError):
            details = {
                "errorDescription": raw_response.decode("utf-8", errors="replace")
            }
        if not isinstance(details, dict):
            details = {}
        message = (
            details.get("errorDescription")
            or details.get("errorCode")
            or "Cloudflare SFU request failed."
        )
        raise SfuError(message, error.code, details) from error
    except Exception as error:
        raise SfuError(str(error)) from error


def create_session():
    return _request("POST", "/sessions/new")


def add_tracks(session_id, payload):
    return _request("POST", f"/sessions/{session_id}/tracks/new", payload)


def renegotiate(session_id, sdp):
    return _request(
        "PUT",
        f"/sessions/{session_id}/renegotiate",
        {"sessionDescription": {"type": "answer", "sdp": sdp}},
    )


def close_tracks(session_id, mids):
    if not mids:
        return {}
    return _request(
        "PUT",
        f"/sessions/{session_id}/tracks/close",
        {"tracks": [{"mid": mid} for mid in mids], "force": True},
    )
