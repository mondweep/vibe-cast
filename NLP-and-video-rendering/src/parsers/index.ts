/**
 * Document Parsers Module
 * Exports all document parsers
 */

export { IDocumentParser } from './IDocumentParser';
export { PowerPointParser } from './PowerPointParser';
export { WordDocumentParser } from './WordDocumentParser';

import { IDocumentParser } from './IDocumentParser';
import { PowerPointParser } from './PowerPointParser';
import { WordDocumentParser } from './WordDocumentParser';
import * as path from 'path';

/**
 * Factory function to get appropriate parser based on file extension
 */
export function getParser(filePath: string): IDocumentParser {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pptx':
      return new PowerPointParser();
    case '.docx':
      return new WordDocumentParser();
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}
