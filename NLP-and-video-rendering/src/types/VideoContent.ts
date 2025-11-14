/**
 * Type definitions for video rendering
 */

export interface VideoSettings {
  resolution: '720p' | '1080p' | '4k';
  fps: number;
  codec: 'h264' | 'h265';
  bitrate?: string;
  transitions: boolean;
  voice: string;
  speed: number;
  pitch?: number;
}

export interface AudioSegment {
  text: string;
  audio: Buffer;
  duration: number;
  startTime: number;
}

export interface Caption {
  startTime: number;
  endTime: number;
  text: string;
}

export interface VideoSegment {
  id: string;
  image: Buffer;
  audio: Buffer;
  duration: number;
  transitions?: {
    in?: string;
    out?: string;
  };
  overlays?: {
    type: 'text' | 'image' | 'shape';
    content: string | Buffer;
    position: { x: number; y: number };
    duration?: number;
  }[];
}

export interface RenderedVideo {
  unitId: string;
  videoFile: string;
  duration: number;
  captions: Caption[];
  thumbnails?: string[];
  formats: {
    mp4?: string;
    webm?: string;
  };
}

export interface VideoContent {
  videos: RenderedVideo[];
  totalDuration: number;
}
