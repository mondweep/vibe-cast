/**
 * Document Parser Interface
 * Base interface for all document parsers
 */

import { ParsedContent } from '../types/ParsedContent';

export interface IDocumentParser {
  /**
   * Parse a document from file path
   * @param filePath Path to the document file
   * @returns Parsed content structure
   */
  parse(filePath: string): Promise<ParsedContent>;

  /**
   * Validate if the file can be parsed
   * @param filePath Path to the document file
   * @returns True if file is valid and can be parsed
   */
  validate(filePath: string): Promise<boolean>;

  /**
   * Get supported file formats
   * @returns Array of supported file extensions
   */
  getSupportedFormats(): string[];
}
