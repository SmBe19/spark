export type CameraFacingMode = 'user' | 'environment';

export interface LocalStream {
  id: string;
  roomId: string;
  label: string;
  clientStreaming: boolean;
  isDisplayMedia: boolean;
  facingMode?: CameraFacingMode;
  stream: MediaStream;
  videoElement: HTMLVideoElement;
  canvas: HTMLCanvasElement;
}

export interface LocalStreamPreview {
  id: string;
  label: string;
  channel?: string;
  isDisplayMedia: boolean;
  facingMode?: CameraFacingMode;
  stream: MediaStream;
}

export interface RemoteStream {
  id: string;
  roomId: string;
  label: string;
  lastUpdateTimeMs: number;
  currentPreviewFrame: string;
  currentBigFrame?: string;
}

export interface RemoteStreamPreview {
  id: string;
  label: string;
  channel?: string;
  currentPreviewFrame: string;
}

export interface ApiRemoteStream {
  id: string;
  label: string;
  current_frame: string;
}

export interface ApiStreamFrameResponse {
  need_big_frame: boolean;
}
