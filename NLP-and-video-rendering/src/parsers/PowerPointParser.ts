/**
 * PowerPoint Parser
 * Parses .pptx files and extracts slides, speaker notes, and media
 */

import { IDocumentParser } from './IDocumentParser';
import {
  ParsedContent,
  ParsedPowerPointContent,
  SlideData,
  TextContent,
  MediaItem,
  DocumentMetadata,
} from '../types/ParsedContent';
import JSZip from 'jszip';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Parser } from 'xml2js';

export class PowerPointParser implements IDocumentParser {
  private readonly supportedFormats = ['.pptx'];

  async parse(filePath: string): Promise<ParsedContent> {
    const isValid = await this.validate(filePath);
    if (!isValid) {
      throw new Error(`Invalid PowerPoint file: ${filePath}`);
    }

    try {
      const slides = await this.parseSlides(filePath);
      const metadata = await this.extractMetadata(filePath);

      const parsedContent: ParsedPowerPointContent = {
        type: 'powerpoint',
        slides,
        metadata,
      };

      return parsedContent;
    } catch (error) {
      throw new Error(`Failed to parse PowerPoint file: ${error}`);
    }
  }

  async validate(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return false;
      }

      const ext = path.extname(filePath).toLowerCase();
      return this.supportedFormats.includes(ext);
    } catch (error) {
      return false;
    }
  }

  getSupportedFormats(): string[] {
    return this.supportedFormats;
  }

  private async parseSlides(filePath: string): Promise<SlideData[]> {
    const fileContent = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(fileContent);
    const slides: SlideData[] = [];

    // Get all slide files
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort();

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      const slideNumber = i + 1;

      const slideXml = await zip.files[slideFile].async('string');
      const slideData = await this.parseSlideXml(slideXml, slideNumber);

      // Get speaker notes for this slide
      const notesFile = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
      if (zip.files[notesFile]) {
        const notesXml = await zip.files[notesFile].async('string');
        slideData.speakerNotes = await this.parseSpeakerNotes(notesXml);
      }

      // Extract media references
      slideData.media = await this.extractMediaFromSlide(zip, slideNumber);

      slides.push(slideData);
    }

    return slides;
  }

  private async parseSlideXml(xml: string, slideNumber: number): Promise<SlideData> {
    const parser = new Parser();
    const result = await parser.parseStringPromise(xml);

    const slide: SlideData = {
      slideNumber,
      title: '',
      content: [],
      speakerNotes: '',
      media: [],
      layout: 'default',
    };

    try {
      // Extract text content from shapes
      const shapes = result?.['p:sld']?.['p:cSld']?.[0]?.['p:spTree']?.[0]?.['p:sp'] || [];

      for (const shape of shapes) {
        const textBody = shape?.['p:txBody']?.[0];
        if (textBody) {
          const paragraphs = textBody['a:p'] || [];

          for (const para of paragraphs) {
            const runs = para['a:r'] || [];
            let textContent = '';

            for (const run of runs) {
              const text = run['a:t']?.[0] || '';
              textContent += text;
            }

            if (textContent.trim()) {
              // Determine if it's a title (first shape typically)
              const isTitle = !slide.title && slide.content.length === 0;

              if (isTitle) {
                slide.title = textContent.trim();
              }

              const content: TextContent = {
                type: isTitle ? 'heading' : 'text',
                content: textContent.trim(),
                formatting: this.extractFormatting(para),
              };

              slide.content.push(content);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not parse slide ${slideNumber} text:`, error);
    }

    return slide;
  }

  private async parseSpeakerNotes(xml: string): Promise<string> {
    try {
      const parser = new Parser();
      const result = await parser.parseStringPromise(xml);

      const shapes = result?.['p:notes']?.['p:cSld']?.[0]?.['p:spTree']?.[0]?.['p:sp'] || [];
      let notesText = '';

      for (const shape of shapes) {
        const textBody = shape?.['p:txBody']?.[0];
        if (textBody) {
          const paragraphs = textBody['a:p'] || [];

          for (const para of paragraphs) {
            const runs = para['a:r'] || [];

            for (const run of runs) {
              const text = run['a:t']?.[0] || '';
              notesText += text + ' ';
            }
          }
        }
      }

      return notesText.trim();
    } catch (error) {
      console.warn('Warning: Could not parse speaker notes:', error);
      return '';
    }
  }

  private extractFormatting(paragraph: any): TextContent['formatting'] {
    const formatting: TextContent['formatting'] = {};

    try {
      const runs = paragraph['a:r'] || [];
      if (runs.length > 0) {
        const rPr = runs[0]['a:rPr']?.[0];
        if (rPr) {
          formatting.bold = rPr['$']?.b === '1';
          formatting.italic = rPr['$']?.i === '1';
          formatting.underline = rPr['$']?.u === 'sng';
          formatting.fontSize = rPr['$']?.sz ? parseInt(rPr['$'].sz) / 100 : undefined;
        }
      }
    } catch (error) {
      // Ignore formatting extraction errors
    }

    return formatting;
  }

  private async extractMediaFromSlide(zip: JSZip, slideNumber: number): Promise<MediaItem[]> {
    const media: MediaItem[] = [];

    try {
      // Look for media in ppt/media folder
      const mediaFiles = Object.keys(zip.files)
        .filter(name => name.startsWith('ppt/media/'));

      for (const mediaFile of mediaFiles) {
        const file = zip.files[mediaFile];
        const data = await file.async('nodebuffer');
        const filename = path.basename(mediaFile);
        const ext = path.extname(filename).toLowerCase();

        let type: 'image' | 'video' | 'audio' = 'image';
        let mimeType = 'application/octet-stream';

        if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'].includes(ext)) {
          type = 'image';
          mimeType = `image/${ext.substring(1)}`;
        } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(ext)) {
          type = 'video';
          mimeType = `video/${ext.substring(1)}`;
        } else if (['.mp3', '.wav', '.m4a'].includes(ext)) {
          type = 'audio';
          mimeType = `audio/${ext.substring(1)}`;
        }

        media.push({
          type,
          data,
          filename,
          mimeType,
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not extract media from slide ${slideNumber}:`, error);
    }

    return media;
  }

  private async extractMetadata(filePath: string): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {};

    try {
      const fileContent = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(fileContent);

      // Try to read core.xml for metadata
      const coreFile = zip.files['docProps/core.xml'];
      if (coreFile) {
        const coreXml = await coreFile.async('string');
        const parser = new Parser();
        const result = await parser.parseStringPromise(coreXml);

        const coreProps = result?.['cp:coreProperties'];
        if (coreProps) {
          metadata.title = coreProps['dc:title']?.[0] || undefined;
          metadata.author = coreProps['dc:creator']?.[0] || undefined;
          metadata.subject = coreProps['dc:subject']?.[0] || undefined;
          metadata.description = coreProps['dc:description']?.[0] || undefined;
          metadata.keywords = coreProps['cp:keywords']?.[0]?.split(',').map((k: string) => k.trim()) || undefined;

          if (coreProps['dcterms:created']?.[0]) {
            metadata.created = new Date(coreProps['dcterms:created'][0]);
          }
          if (coreProps['dcterms:modified']?.[0]) {
            metadata.modified = new Date(coreProps['dcterms:modified'][0]);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not extract metadata:', error);
    }

    // Fallback to filename as title if no title found
    if (!metadata.title) {
      metadata.title = path.basename(filePath, path.extname(filePath));
    }

    return metadata;
  }
}
