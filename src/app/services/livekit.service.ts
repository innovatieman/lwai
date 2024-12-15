import { Injectable } from '@angular/core';
import { Room, createLocalTracks, TrackPublishDefaults } from 'livekit-client';

@Injectable({
  providedIn: 'root',
})
export class LiveKitService {
  private room: Room | null = null;

  async connectToRoom(serverUrl: string, token: string): Promise<Room> {
    if (this.room) {
      this.disconnect(); // Sluit eerdere verbindingen
    }

    this.room = new Room({
      publishDefaults: {
        videoEncoding: {
          maxBitrate: 1700000,
          maxFramerate: 30,
        },
      } as TrackPublishDefaults,
    });

    await this.room.connect(serverUrl, token);

    // Luister naar evenementen
    this.room.on('participantConnected', (participant) => {
      console.log(`Participant connected: ${participant.identity}`);
    });

    this.room.on('trackSubscribed', (track, publication, participant) => {
      console.log(`Track subscribed: ${track.kind}`);
      if (track.kind === 'video') {
        const videoElement = document.createElement('video');
        videoElement.srcObject = new MediaStream([track.mediaStreamTrack]);
        videoElement.autoplay = true;
        document.body.appendChild(videoElement);
      }
    });

    this.room.on('disconnected', () => {
      console.log('Disconnected from room');
      this.room = null;
    });

    return this.room;
  }

  disconnect() {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
  }
}