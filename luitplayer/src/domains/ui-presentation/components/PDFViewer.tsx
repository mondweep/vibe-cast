/**
 * PDF Viewer Component
 * Displays PDF score pages with follow-along cursor
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { PDFProcessor } from '@domains/pdf-processing';

interface PDFViewerProps {
  pdfUrl?: string;
  currentMeasure?: number;
  isPlaying?: boolean;
  onPageLoad?: (pageNumber: number, totalPages: number) => void;
}

interface CursorPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function PDFViewer({
  pdfUrl,
  currentMeasure = 0,
  isPlaying = false,
  onPageLoad,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const processorRef = useRef<PDFProcessor | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null);

  // Initialize PDF processor
  useEffect(() => {
    processorRef.current = new PDFProcessor();
    return () => {
      processorRef.current?.dispose();
    };
  }, []);

  // Load PDF when URL changes
  useEffect(() => {
    if (!pdfUrl || !processorRef.current) return;

    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const numPages = await processorRef.current!.loadPDF(pdfUrl);
        setTotalPages(numPages);
        setCurrentPage(1);
        onPageLoad?.(1, numPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [pdfUrl, onPageLoad]);

  // Render current page
  useEffect(() => {
    if (!canvasRef.current || !processorRef.current || totalPages === 0) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        // Cancel previous render if any
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const task = await processorRef.current!.renderPageToCanvas(
          currentPage,
          canvasRef.current!,
          scale
        );

        if (isCancelled) {
          task.cancel();
          return;
        }

        renderTaskRef.current = task;
        await task.promise;
      } catch (err: unknown) {
        // Ignore cancellation errors
        if ((err as { name?: string })?.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Failed to render page:', err);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [currentPage, scale, totalPages]);

  // Update cursor position based on current measure
  useEffect(() => {
    if (!canvasRef.current || currentMeasure <= 0) {
      setCursorPosition(null);
      return;
    }

    // Calculate cursor position based on measure
    const measuresPerPage = 4;
    const measureOnPage = ((currentMeasure - 1) % measuresPerPage) + 1;
    const pageForMeasure = Math.ceil(currentMeasure / measuresPerPage);

    // Auto-turn page only if playing
    if (
      isPlaying &&
      totalPages > 0 &&
      pageForMeasure <= totalPages &&
      pageForMeasure !== currentPage
    ) {
      setCurrentPage(pageForMeasure);
    }

    // Only show cursor if we are on the correct page
    if (pageForMeasure !== currentPage) {
      setCursorPosition(null);
      return;
    }

    const canvas = canvasRef.current;
    const measureWidth = canvas.width / measuresPerPage;

    setCursorPosition({
      x: (measureOnPage - 1) * measureWidth,
      y: 0,
      width: measureWidth,
      height: canvas.height, // Full height
    });
  }, [currentMeasure, currentPage, isPlaying, totalPages]);

  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  }, [totalPages]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#2a2a3e',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: '#1a1a2e',
          borderBottom: '1px solid #3a3a5e',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3a3a5e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage <= 1 ? 0.5 : 1,
            }}
          >
            Prev
          </button>
          <span style={{ color: '#aaa', fontSize: '14px' }}>
            Page {currentPage} of {totalPages || '-'}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3a3a5e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage >= totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleZoomOut}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3a3a5e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <span style={{ color: '#aaa', fontSize: '14px' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3a3a5e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '16px',
          position: 'relative',
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#e94560',
              fontSize: '18px',
            }}
          >
            Loading PDF...
          </div>
        )}

        {error && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#e94560',
              fontSize: '16px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {!pdfUrl && !isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#666',
              fontSize: '16px',
              textAlign: 'center',
            }}
          >
            Drop a PDF score here or click to upload
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            style={{
              display: totalPages > 0 ? 'block' : 'none',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          />

          {cursorPosition && (
            <div
              style={{
                position: 'absolute',
                left: cursorPosition.x,
                top: cursorPosition.y,
                width: cursorPosition.width,
                height: cursorPosition.height,
                backgroundColor: 'rgba(233, 69, 96, 0.2)',
                border: '2px solid #e94560',
                pointerEvents: 'none',
                transition: 'all 0.1s ease-out',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
