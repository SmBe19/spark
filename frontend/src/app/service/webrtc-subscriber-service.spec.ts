import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WebrtcSubscriberService } from './webrtc-subscriber-service';
import { SocketService } from './socket-service';
import { RoomInfoService } from './room-info-service';
import { LocalStreamService } from './local-stream-service';
import { DirectStreamService } from './direct-stream-service';
import { SfuSignallingService } from './sfu-signalling-service';

class FakeMediaStream {
  constructor(private tracks: MediaStreamTrack[]) {}

  getTracks() {
    return this.tracks;
  }
}

describe('WebrtcSubscriberService', () => {
  let service: WebrtcSubscriberService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SocketService, useValue: { socket: { on: vi.fn(), emit: vi.fn() } } },
        {
          provide: RoomInfoService,
          useValue: {
            activeRoom: signal(null),
            activeRoomId: signal(null),
            isAdminRoom: () => false,
          },
        },
        { provide: LocalStreamService, useValue: { localStreams: signal({}) } },
        { provide: DirectStreamService, useValue: { parentLocalStreams: signal({}) } },
        { provide: SfuSignallingService, useValue: { emit: vi.fn() } },
      ],
    });
    service = TestBed.inject(WebrtcSubscriberService);
    TestBed.flushEffects();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('refreshes the track handler when reusing a prepared connection', async () => {
    const track = { stop: vi.fn() } as unknown as MediaStreamTrack;
    const rtcPeerConnection = {
      ontrack: null,
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    } as unknown as RTCPeerConnection;

    (service as any).generation = 2;
    rtcPeerConnection.ontrack = (service as any).createTrackHandler(1);

    vi.stubGlobal('MediaStream', FakeMediaStream);
    try {
      await (service as any).applyRemoteDescription(
        rtcPeerConnection,
        'session-id',
        { type: 'answer', sdp: 'sdp' },
        2,
      );
      rtcPeerConnection.ontrack!({ track } as RTCTrackEvent);

      expect(track.stop).not.toHaveBeenCalled();
      expect(service.activeWebrtcStream()).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
