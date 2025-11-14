/**
 * Word Document Parser
 * Parses .docx files and extracts sections, comments (speaker notes), and media
 */

import { IDocumentParser } from './IDocumentParser';
import {
  ParsedContent,
  ParsedWordContent,
  SectionData,
  MediaItem,
  DocumentMetadata,
  TableData,
} from '../types/ParsedContent';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Parser } from 'xml2js';

export class WordDocumentParser implements IDocumentParser {
  private readonly supportedFormats = ['.docx'];

  async parse(filePath: string): Promise<ParsedContent> {
    const isValid = await this.validate(filePath);
    if (!isValid) {
      throw new Error(`Invalid Word document file: ${filePath}`);
    }

    try {
      const sections = await this.parseSections(filePath);
      const metadata = await this.extractMetadata(filePath);

      const parsedContent: ParsedWordContent = {
        type: 'word',
        sections,
        metadata,
      };

      return parsedContent;
    } catch (error) {
      throw new Error(`Failed to parse Word document: ${error}`);
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

  private async parseSections(filePath: string): Promise<SectionData[]> {
    const fileBuffer = await fs.readFile(filePath);

    // Use mammoth to extract structured content
    const result = await mammoth.convertToHtml(
      { buffer: fileBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
        ],
      }
    );

    const html = result.value;
    const sections: SectionData[] = [];
    let currentSection: SectionData | null = null;

    // Parse HTML to extract sections
    const lines = html.split('\n');
    let inParagraph = false;
    let paragraphText = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for headings
      const h1Match = trimmed.match(/<h1>(.*?)<\/h1>/);
      const h2Match = trimmed.match(/<h2>(.*?)<\/h2>/);
      const h3Match = trimmed.match(/<h3>(.*?)<\/h3>/);

      if (h1Match || h2Match || h3Match) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }

        const level = h1Match ? 1 : h2Match ? 2 : 3;
        const title = (h1Match || h2Match || h3Match)![1]
          .replace(/<[^>]*>/g, '')
          .trim();

        currentSection = {
          title,
          level,
          content: [],
          speakerNotes: [],
          media: [],
        };
      } else if (trimmed.startsWith('<p>')) {
        // Extract paragraph content
        const text = trimmed
          .replace(/<p>/, '')
          .replace(/<\/p>/, '')
          .replace(/<[^>]*>/g, '')
          .trim();

        if (text && currentSection) {
          currentSection.content.push({
            type: 'paragraph',
            content: text,
          });
        } else if (text && !currentSection) {
          // Create a default section for content before first heading
          currentSection = {
            title: 'Introduction',
            level: 1,
            content: [],
            speakerNotes: [],
            media: [],
          };
          currentSection.content.push({
            type: 'paragraph',
            content: text,
          });
        }
      }
    }

    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    // Extract comments (speaker notes), media, and tables
    await this.enrichSections(fileBuffer, sections);

    return sections.length > 0 ? sections : this.createDefaultSection();
  }

  private async enrichSections(
    fileBuffer: Buffer,
    sections: SectionData[]
  ): Promise<void> {
    const zip = await JSZip.loadAsync(fileBuffer);

    // Extract comments
    const comments = await this.extractComments(zip);
    if (comments.length > 0 && sections.length > 0) {
      // Distribute comments across sections
      // For simplicity, add all comments to first section
      // In production, you'd map comments to specific paragraphs
      sections[0].speakerNotes = comments;
    }

    // Extract media
    const media = await this.extractMedia(zip);
    if (media.length > 0 && sections.length > 0) {
      // Distribute media across sections
      const mediaPerSection = Math.ceil(media.length / sections.length);
      let mediaIndex = 0;

      for (const section of sections) {
        const sectionMedia = media.slice(mediaIndex, mediaIndex + mediaPerSection);
        section.media = sectionMedia;
        mediaIndex += mediaPerSection;
      }
    }

    // Extract tables
    const tables = await this.extractTables(zip);
    if (tables.length > 0 && sections.length > 0) {
      // Add tables to relevant sections
      const tablesPerSection = Math.ceil(tables.length / sections.length);
      let tableIndex = 0;

      for (const section of sections) {
        const sectionTables = tables.slice(tableIndex, tableIndex + tablesPerSection);
        section.tables = sectionTables;
        tableIndex += tablesPerSection;
      }
    }
  }

  private async extractComments(zip: JSZip): Promise<string[]> {
    const comments: string[] = [];

    try {
      const commentsFile = zip.files['word/comments.xml'];
      if (commentsFile) {
        const commentsXml = await commentsFile.async('string');
        const parser = new Parser();
        const result = await parser.parseStringPromise(commentsXml);

        const commentsList = result?.['w:comments']?.['w:comment'] || [];

        for (const comment of commentsList) {
          const paragraphs = comment['w:p'] || [];
          let commentText = '';

          for (const para of paragraphs) {
            const runs = para['w:r'] || [];
            for (const run of runs) {
              const texts = run['w:t'] || [];
              for (const text of texts) {
                commentText += (typeof text === 'string' ? text : text._) + ' ';
              }
            }
          }

          if (commentText.trim()) {
            comments.push(commentText.trim());
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not extract comments:', error);
    }

    return comments;
  }

  private async extractMedia(zip: JSZip): Promise<MediaItem[]> {
    const media: MediaItem[] = [];

    try {
      const mediaFiles = Object.keys(zip.files)
        .filter(name => name.startsWith('word/media/'));

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
      console.warn('Warning: Could not extract media:', error);
    }

    return media;
  }

  private async extractTables(zip: JSZip): Promise<TableData[]> {
    const tables: TableData[] = [];

    try {
      const documentFile = zip.files['word/document.xml'];
      if (documentFile) {
        const documentXml = await documentFile.async('string');
        const parser = new Parser();
        const result = await parser.parseStringPromise(documentXml);

        const tablesList = this.findTables(result);

        for (const table of tablesList) {
          const tableData = this.parseTable(table);
          if (tableData) {
            tables.push(tableData);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not extract tables:', error);
    }

    return tables;
  }

  private findTables(obj: any): any[] {
    const tables: any[] = [];

    const traverse = (node: any) => {
      if (!node || typeof node !== 'object') return;

      if (node['w:tbl']) {
        tables.push(...(Array.isArray(node['w:tbl']) ? node['w:tbl'] : [node['w:tbl']]));
      }

      for (const key in node) {
        if (Array.isArray(node[key])) {
          node[key].forEach((item: any) => traverse(item));
        } else if (typeof node[key] === 'object') {
          traverse(node[key]);
        }
      }
    };

    traverse(obj);
    return tables;
  }

  private parseTable(table: any): TableData | null {
    try {
      const rows = table['w:tr'] || [];
      if (rows.length === 0) return null;

      const headers: string[] = [];
      const dataRows: string[][] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row['w:tc'] || [];
        const cellTexts: string[] = [];

        for (const cell of cells) {
          const paragraphs = cell['w:p'] || [];
          let cellText = '';

          for (const para of paragraphs) {
            const runs = para['w:r'] || [];
            for (const run of runs) {
              const texts = run['w:t'] || [];
              for (const text of texts) {
                cellText += (typeof text === 'string' ? text : text._) + ' ';
              }
            }
          }

          cellTexts.push(cellText.trim());
        }

        if (i === 0) {
          headers.push(...cellTexts);
        } else {
          dataRows.push(cellTexts);
        }
      }

      return {
        headers,
        rows: dataRows,
      };
    } catch (error) {
      console.warn('Warning: Could not parse table:', error);
      return null;
    }
  }

  private async extractMetadata(filePath: string): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {};

    try {
      const fileBuffer = await fs.readFile(filePath);
      const zip = await JSZip.loadAsync(fileBuffer);

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

    if (!metadata.title) {
      metadata.title = path.basename(filePath, path.extname(filePath));
    }

    return metadata;
  }

  private createDefaultSection(): SectionData[] {
    return [
      {
        title: 'Content',
        level: 1,
        content: [],
        speakerNotes: [],
        media: [],
      },
    ];
  }
}
