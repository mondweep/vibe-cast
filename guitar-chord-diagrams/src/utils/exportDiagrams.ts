/**
 * Export chord diagrams as PNG or print-friendly layout.
 */

export function exportAsPng(svgElement: SVGSVGElement, filename: string): void {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const scale = 2; // retina
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.scale(scale, scale);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${filename}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };

  img.src = url;
}

export function exportGridAsPng(containerEl: HTMLElement, filename: string): void {
  // Use html2canvas approach: render SVGs into a combined canvas
  const svgs = containerEl.querySelectorAll('svg');
  if (svgs.length === 0) return;

  const padding = 20;
  const cols = Math.min(svgs.length, 6);
  const rows = Math.ceil(svgs.length / cols);

  // Get dimensions from first SVG
  const firstSvg = svgs[0];
  const svgWidth = firstSvg.viewBox.baseVal.width || 140;
  const svgHeight = firstSvg.viewBox.baseVal.height || 200;

  const scale = 2;
  const canvasWidth = (cols * (svgWidth + padding) + padding) * scale;
  const canvasHeight = (rows * (svgHeight + padding) + padding) * scale;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasWidth / scale, canvasHeight / scale);

  let loaded = 0;
  svgs.forEach((svg, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (svgWidth + padding);
    const y = padding + row * (svgHeight + padding);

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, svgWidth, svgHeight);
      URL.revokeObjectURL(url);
      loaded++;
      if (loaded === svgs.length) {
        canvas.toBlob(b => {
          if (!b) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = `${filename}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }, 'image/png');
      }
    };
    img.src = url;
  });
}

export function printDiagrams(): void {
  window.print();
}

export function generateShareUrl(chordName: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('chord', chordName);
  return url.toString();
}
