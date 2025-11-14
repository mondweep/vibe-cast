/**
 * Type definitions for parsed content from PowerPoint and Word documents
 */

export interface MediaItem {
  type: 'image' | 'video' | 'audio';
  data: Buffer;
  url?: string;
  filename: string;
  mimeType: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TextContent {
  type: 'text' | 'heading' | 'paragraph' | 'list';
  content: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
  };
  position?: {
    x: number;
    y: number;
  };
}

export interface SlideData {
  slideNumber: number;
  title: string;
  content: TextContent[];
  speakerNotes: string;
  media: MediaItem[];
  layout: string;
  duration?: number;
}

export interface SectionData {
  title: string;
  level: number;
  content: TextContent[];
  speakerNotes: string[];
  media: MediaItem[];
  tables?: TableData[];
}

export interface TableData {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  created?: Date;
  modified?: Date;
  description?: string;
}

export interface ParsedPowerPointContent {
  type: 'powerpoint';
  slides: SlideData[];
  metadata: DocumentMetadata;
}

export interface ParsedWordContent {
  type: 'word';
  sections: SectionData[];
  metadata: DocumentMetadata;
}

export type ParsedContent = ParsedPowerPointContent | ParsedWordContent;
