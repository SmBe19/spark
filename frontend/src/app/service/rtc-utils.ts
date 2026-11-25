export interface SfuSessionDescription {
  type: RTCSdpType;
  sdp: string;
}

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
  bundlePolicy: 'max-bundle',
};

const ICE_GATHERING_TIMEOUT_MS = 3000;
const CONNECTION_TIMEOUT_MS = 5000;

export function closePeerConnection(rtcPeerConnection: RTCPeerConnection | null) {
  if (!rtcPeerConnection) {
    return;
  }
  rtcPeerConnection.ontrack = null;
  rtcPeerConnection.close();
}

export function waitForConnection(rtcPeerConnection: RTCPeerConnection) {
  if (rtcPeerConnection.connectionState === 'connected') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      rtcPeerConnection.removeEventListener('connectionstatechange', onStateChange);
      resolve();
    };
    const timeout = window.setTimeout(finish, CONNECTION_TIMEOUT_MS);
    const onStateChange = () => {
      const state = rtcPeerConnection.connectionState;
      if (state === 'connected' || state === 'failed' || state === 'closed') {
        finish();
      }
    };
    rtcPeerConnection.addEventListener('connectionstatechange', onStateChange);
  });
}

export function waitForIceGathering(rtcPeerConnection: RTCPeerConnection) {
  if (rtcPeerConnection.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      rtcPeerConnection.removeEventListener('icegatheringstatechange', onStateChange);
      resolve();
    };
    const timeout = window.setTimeout(finish, ICE_GATHERING_TIMEOUT_MS);
    const onStateChange = () => {
      if (rtcPeerConnection.iceGatheringState === 'complete') {
        finish();
      }
    };
    rtcPeerConnection.addEventListener('icegatheringstatechange', onStateChange);
  });
}
