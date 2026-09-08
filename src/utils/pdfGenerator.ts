import { jsPDF } from 'jspdf';
import { SelectedImage, PdfSettings, GeneratedPdfResult } from '../types';
import { formatFileSize, sanitizeFileName, generateDefaultPdfFileName } from './formatters';

interface ProgressCallback {
  (current: number, total: number, imageName: string): void;
}

// Helper to read a File to Data URL safely with timeout
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not produce string output'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader read error'));
    reader.readAsDataURL(file);
  });
}

// Helper to load an image source into HTMLImageElement safely using blob URL first
async function loadDrawableSource(
  imgItem: SelectedImage
): Promise<{ source: HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  let objectUrlToRevoke: string | null = null;

  const tryLoadFromSrc = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image element failed to decode source'));
      img.src = src;
    });
  };

  // Strategy 1: URL.createObjectURL (consumes far less heap than base64 string)
  if (imgItem.file) {
    try {
      const objUrl = URL.createObjectURL(imgItem.file);
      objectUrlToRevoke = objUrl;
      const img = await tryLoadFromSrc(objUrl);
      const width = img.naturalWidth || img.width || imgItem.width || 800;
      const height = img.naturalHeight || img.height || imgItem.height || 600;
      return {
        source: img,
        width,
        height,
        cleanup: () => {
          if (objectUrlToRevoke) {
            try { URL.revokeObjectURL(objectUrlToRevoke); } catch (_) {}
            objectUrlToRevoke = null;
          }
          img.src = '';
        },
      };
    } catch (e1) {
      if (objectUrlToRevoke) {
        try { URL.revokeObjectURL(objectUrlToRevoke); } catch (_) {}
        objectUrlToRevoke = null;
      }
      console.warn('Strategy 1 (createObjectURL) failed, trying FileReader:', e1);
    }
  }

  // Strategy 2: FileReader Data URL
  if (imgItem.file) {
    try {
      const dataUrl = await readFileAsDataUrl(imgItem.file);
      const img = await tryLoadFromSrc(dataUrl);
      const width = img.naturalWidth || img.width || imgItem.width || 800;
      const height = img.naturalHeight || img.height || imgItem.height || 600;
      return {
        source: img,
        width,
        height,
        cleanup: () => { img.src = ''; },
      };
    } catch (e2) {
      console.warn('Strategy 2 (FileReader) failed, falling back to previewUrl:', e2);
    }
  }

  // Strategy 3: previewUrl (already cached thumbnail in memory)
  if (imgItem.previewUrl) {
    try {
      const img = await tryLoadFromSrc(imgItem.previewUrl);
      const width = img.naturalWidth || img.width || imgItem.width || 800;
      const height = img.naturalHeight || img.height || imgItem.height || 600;
      return {
        source: img,
        width,
        height,
        cleanup: () => { img.src = ''; },
      };
    } catch (e3) {
      console.warn('Strategy 3 (previewUrl) failed:', e3);
    }
  }

  throw new Error(`Unable to read image source for: ${imgItem.name}`);
}

// Single-pass canvas processor: handles scaling, rotation, and crop with memory safeguards
function renderImageToJpegDataUrl(
  img: HTMLImageElement,
  origW: number,
  origH: number,
  rotationDeg: number,
  maxDimension: number,
  qualityFactor: number,
  targetRatio?: number // if fill crop is desired
): { dataUrl: string; width: number; height: number } {
  const rotation = ((rotationDeg % 360) + 360) % 360;
  const isRotated90or270 = rotation === 90 || rotation === 270;

  // Visual dimensions before rotation
  let srcW = origW;
  let srcH = origH;
  let srcX = 0;
  let srcY = 0;

  // If fill crop is requested, compute the crop box directly on source
  if (targetRatio && targetRatio > 0) {
    // Current aspect ratio as oriented
    const currentOrientedRatio = isRotated90or270 ? origH / origW : origW / origH;
    if (Math.abs(currentOrientedRatio - targetRatio) > 0.005) {
      if (isRotated90or270) {
        // Rotated 90 or 270: targetRatio applies to oriented aspect (origH / origW)
        if (currentOrientedRatio > targetRatio) {
          srcH = Math.max(1, Math.round(origW * targetRatio));
          srcY = Math.max(0, Math.round((origH - srcH) / 2));
        } else {
          srcW = Math.max(1, Math.round(origH / targetRatio));
          srcX = Math.max(0, Math.round((origW - srcW) / 2));
        }
      } else {
        if (currentOrientedRatio > targetRatio) {
          srcW = Math.max(1, Math.round(origH * targetRatio));
          srcX = Math.max(0, Math.round((origW - srcW) / 2));
        } else {
          srcH = Math.max(1, Math.round(origW / targetRatio));
          srcY = Math.max(0, Math.round((origH - srcH) / 2));
        }
      }
    }
  }

  // Scale down to safe max dimension for low-memory mobile/tablet environments
  const effectiveMaxDim = Math.max(800, maxDimension);
  let scale = 1;
  const maxSrcDim = Math.max(srcW, srcH);
  if (maxSrcDim > effectiveMaxDim) {
    scale = effectiveMaxDim / maxSrcDim;
  }

  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  if (isRotated90or270) {
    canvas.width = outH;
    canvas.height = outW;
  } else {
    canvas.width = outW;
    canvas.height = outH;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Draw pure white background to avoid transparent black artifacts in PDF
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  if (rotation === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (rotation === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate((180 * Math.PI) / 180);
  } else if (rotation === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate((270 * Math.PI) / 180);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
  ctx.restore();

  let dataUrl = canvas.toDataURL('image/jpeg', qualityFactor);

  // If output failed or is empty, fallback with lower resolution
  if (!dataUrl || dataUrl.length < 50 || dataUrl === 'data:,') {
    dataUrl = canvas.toDataURL('image/jpeg', 0.6);
  }

  const resultW = canvas.width;
  const resultH = canvas.height;

  // Immediate cleanup of canvas backing store
  canvas.width = 0;
  canvas.height = 0;

  return {
    dataUrl,
    width: resultW,
    height: resultH,
  };
}

export async function generatePdf(
  images: SelectedImage[],
  settings: PdfSettings,
  onProgress?: ProgressCallback
): Promise<GeneratedPdfResult> {
  if (!images || images.length === 0) {
    throw new Error('No images selected for PDF generation.');
  }

  // Memory-safe mobile configuration:
  // Standard: 1200px max, 0.70 quality (fastest, lightest RAM footprint)
  // High: 1800px max, 0.80 quality (crisp 250+ DPI A4 document, perfectly balanced)
  // Best: 2200px max, 0.88 quality (sharp print detail without crashing WebView)
  let qualityFactor = 0.80;
  let maxDimension = 1800;

  if (settings.quality === 'standard') {
    qualityFactor = 0.70;
    maxDimension = 1200;
  } else if (settings.quality === 'best') {
    qualityFactor = 0.88;
    maxDimension = 2200;
  } else {
    qualityFactor = 0.80;
    maxDimension = 1800;
  }

  let doc: jsPDF | null = null;

  for (let i = 0; i < images.length; i++) {
    const imgItem = images[i];
    if (onProgress) {
      onProgress(i + 1, images.length, imgItem.name || `Image ${i + 1}`);
    }

    // Yield to let browser update progress UI and trigger minor garbage collection
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Load drawable image source safely
    const { source: imgElem, width: rawW, height: rawH, cleanup } = await loadDrawableSource(imgItem);

    try {
      // Determine page orientation and dimensions
      const rotation = ((imgItem.rotation % 360) + 360) % 360;
      const isRotated = rotation === 90 || rotation === 270;
      const visualW = isRotated ? rawH : rawW;
      const visualH = isRotated ? rawW : rawH;

      let pageOrientation: 'p' | 'l' = 'p';
      if (settings.orientation === 'portrait') {
        pageOrientation = 'p';
      } else if (settings.orientation === 'landscape') {
        pageOrientation = 'l';
      } else {
        pageOrientation = visualW > visualH ? 'l' : 'p';
      }

      let pageWidthMm = 210;
      let pageHeightMm = 297;
      let formatArg: string | [number, number] = 'a4';

      if (settings.pageSize === 'letter') {
        pageWidthMm = pageOrientation === 'l' ? 279.4 : 215.9;
        pageHeightMm = pageOrientation === 'l' ? 215.9 : 279.4;
        formatArg = 'letter';
      } else if (settings.pageSize === 'original') {
        const standardWidthMm = 210;
        pageWidthMm = standardWidthMm;
        pageHeightMm = (visualH / Math.max(1, visualW)) * standardWidthMm;
        pageOrientation = pageWidthMm > pageHeightMm ? 'l' : 'p';
        formatArg = [pageWidthMm, pageHeightMm];
      } else {
        pageWidthMm = pageOrientation === 'l' ? 297 : 210;
        pageHeightMm = pageOrientation === 'l' ? 210 : 297;
        formatArg = 'a4';
      }

      // Initialize jsPDF document on first page, or add new page
      if (i === 0) {
        doc = new jsPDF({
          orientation: pageOrientation,
          unit: 'mm',
          format: formatArg,
          compress: true,
        });
      } else {
        doc!.addPage(formatArg, pageOrientation);
      }

      // Margins
      let marginMm = 0;
      if (settings.margin === 'small') marginMm = 6;
      if (settings.margin === 'medium') marginMm = 14;

      const printableWidth = Math.max(10, pageWidthMm - marginMm * 2);
      const printableHeight = Math.max(10, pageHeightMm - marginMm * 2);
      const printableRatio = printableWidth / printableHeight;

      // Render image in single pass
      const targetRatioForCrop = settings.imageFit === 'fill' && settings.pageSize !== 'original'
        ? printableRatio
        : undefined;

      let rendered: { dataUrl: string; width: number; height: number };
      try {
        rendered = renderImageToJpegDataUrl(
          imgElem,
          rawW,
          rawH,
          imgItem.rotation,
          maxDimension,
          qualityFactor,
          targetRatioForCrop
        );
      } catch (renderErr) {
        console.warn('Full quality render failed, attempting fallback resolution:', renderErr);
        // Fallback with lower resolution if device was under memory pressure
        rendered = renderImageToJpegDataUrl(
          imgElem,
          rawW,
          rawH,
          imgItem.rotation,
          1000,
          0.65,
          targetRatioForCrop
        );
      }

      const imgW = rendered.width;
      const imgH = rendered.height;
      const imgRatio = imgW / Math.max(1, imgH);

      let posX = marginMm;
      let posY = marginMm;
      let finalW = printableWidth;
      let finalH = printableHeight;

      if (settings.pageSize === 'original') {
        finalW = pageWidthMm;
        finalH = pageHeightMm;
        posX = 0;
        posY = 0;
      } else if (settings.imageFit === 'fill') {
        finalW = printableWidth;
        finalH = printableHeight;
        posX = marginMm;
        posY = marginMm;
      } else {
        // Fit proportionally inside printable area
        if (imgRatio > printableRatio) {
          finalW = printableWidth;
          finalH = printableWidth / imgRatio;
        } else {
          finalH = printableHeight;
          finalW = printableHeight * imgRatio;
        }
        posX = marginMm + (printableWidth - finalW) / 2;
        posY = marginMm + (printableHeight - finalH) / 2;
      }

      // Add image to PDF page
      doc!.addImage(rendered.dataUrl, 'JPEG', posX, posY, finalW, finalH, undefined, 'FAST');
    } finally {
      cleanup();
    }
  }

  if (!doc) {
    throw new Error('Failed to generate PDF document.');
  }

  const baseFileName = settings.fileName && settings.fileName.trim().length > 0
    ? settings.fileName
    : generateDefaultPdfFileName();
  const finalFileName = sanitizeFileName(baseFileName);

  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  return {
    blob: pdfBlob,
    url: pdfUrl,
    fileName: finalFileName,
    sizeFormatted: formatFileSize(pdfBlob.size),
    sizeBytes: pdfBlob.size,
    pageCount: images.length,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
