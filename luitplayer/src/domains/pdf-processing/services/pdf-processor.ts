/**
 * PDF Processing Domain
 * Handles PDF loading, rendering, and coordinate mapping
 * See ADR-001 for architecture details
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

export interface PDFPage {
  pageNumber: number;
  width: number;
  height: number;
  imageData: ImageData;
}

export interface PDFDocument {
  numPages: number;
  pages: PDFPage[];
}

export interface PageCoordinate {
  x: number;
  y: number;
  pageNumber: number;
}

/**
 * PDF Processing Service
 */
export class PDFProcessor {
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  private scale = 2.0; // Higher scale for better OMR accuracy

  /**
   * Load a PDF from a URL or ArrayBuffer
   */
  async loadPDF(source: string | ArrayBuffer): Promise<number> {
    const loadingTask = pdfjsLib.getDocument(source);
    this.pdfDocument = await loadingTask.promise;
    return this.pdfDocument.numPages;
  }

  /**
   * Render a single page to ImageData for OMR processing
   */
  async renderPageToImageData(pageNumber: number): Promise<PDFPage> {
    if (!this.pdfDocument) {
      throw new Error('No PDF loaded');
    }

    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: this.scale });

    // Create canvas for rendering
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    // Render PDF page to canvas
    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    // Get image data for OMR processing
    const imageData = context.getImageData(0, 0, viewport.width, viewport.height);

    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      imageData,
    };
  }

  /**
   * Render a page to a canvas element for display
   */
  async renderPageToCanvas(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    displayScale = 1.0
  ): Promise<void> {
    if (!this.pdfDocument) {
      throw new Error('No PDF loaded');
    }

    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: displayScale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;
  }

  /**
   * Get page dimensions
   */
  async getPageDimensions(
    pageNumber: number
  ): Promise<{ width: number; height: number }> {
    if (!this.pdfDocument) {
      throw new Error('No PDF loaded');
    }

    const page = await this.pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });

    return {
      width: viewport.width,
      height: viewport.height,
    };
  }

  /**
   * Get number of pages
   */
  get numPages(): number {
    return this.pdfDocument?.numPages || 0;
  }

  /**
   * Set rendering scale
   */
  setScale(scale: number): void {
    this.scale = Math.max(0.5, Math.min(4.0, scale));
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.pdfDocument) {
      await this.pdfDocument.destroy();
      this.pdfDocument = null;
    }
  }
}

/**
 * Create a PDF processor instance
 */
export function createPDFProcessor(): PDFProcessor {
  return new PDFProcessor();
}
