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
  let socketOn: ReturnType<typeof vi.fn>;
  let activeRoom: ReturnType<typeof signal<any>>;

  const streamReadyHandler = () =>
    socketOn.mock.calls.find(([event]) => event === 'sfu_stream_ready')?.[1] as (
      data: Record<string, unknown>,
    ) => void;

  beforeEach(() => {
    socketOn = vi.fn();
    activeRoom = signal(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: SocketService, useValue: { socket: { on: socketOn, emit: vi.fn() } } },
        {
          provide: RoomInfoService,
          useValue: {
            activeRoom,
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

  it('keeps the existing track when the publisher swaps the source on the same publication', () => {
    activeRoom.set({
      id: 'room-1',
      activeMode: 'stream',
      stream: { activeStreamId: 'stream-b', webrtcStreaming: true, streamToClients: true },
    });
    (service as any).rtcPeerConnection = {};
    (service as any).subscribedPublicationSessionId = 'publication-1';
    const syncSpy = vi.spyOn(service as any, 'sync');

    streamReadyHandler()({
      room_id: 'room-1',
      stream_id: 'stream-b',
      publication_session_id: 'publication-1',
      source_swapped: true,
    });

    expect(syncSpy).not.toHaveBeenCalled();
  });

  it('re-subscribes when the publication changes', () => {
    activeRoom.set({
      id: 'room-1',
      activeMode: 'stream',
      stream: { activeStreamId: 'stream-b', webrtcStreaming: true, streamToClients: true },
    });
    (service as any).rtcPeerConnection = {};
    (service as any).subscribedPublicationSessionId = 'publication-1';
    const syncSpy = vi.spyOn(service as any, 'sync');

    streamReadyHandler()({
      room_id: 'room-1',
      stream_id: 'stream-b',
      publication_session_id: 'publication-2',
      source_swapped: false,
    });

    expect(syncSpy).toHaveBeenCalledWith(true);
  });
});
