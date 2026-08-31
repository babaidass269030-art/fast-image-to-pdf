import { jsPDF } from 'jspdf';
import { SelectedImage, PdfSettings, GeneratedPdfResult } from '../types';
import { formatFileSize, sanitizeFileName, generateDefaultPdfFileName } from './formatters';

interface ProgressCallback {
  (current: number, total: number, imageName: string): void;
}

// Helper to read a File to Data URL safely via FileReader
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

// Helper to load an image source into HTMLImageElement or ImageBitmap safely
async function loadDrawableSource(
  imgItem: SelectedImage
): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  // Strategy 1: Try reading file via FileReader if available (most reliable across Android WebViews / iframes)
  if (imgItem.file) {
    try {
      const dataUrl = await readFileAsDataUrl(imgItem.file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image decode failed from file dataUrl'));
        img.src = dataUrl;
      });
      const width = img.naturalWidth || img.width || imgItem.width || 800;
      const height = img.naturalHeight || img.height || imgItem.height || 600;
      return { source: img, width, height };
    } catch (e1) {
      console.warn('FileReader strategy failed, attempting blob URL:', e1);
    }
  }

  // Strategy 2: Try URL.createObjectURL without crossOrigin
  if (imgItem.file) {
    try {
      const blobUrl = URL.createObjectURL(imgItem.file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Blob URL image load failed'));
        img.src = blobUrl;
      });
      URL.revokeObjectURL(blobUrl);
      const width = img.naturalWidth || img.width || imgItem.width || 800;
      const height = img.naturalHeight || img.height || imgItem.height || 600;
      return { source: img, width, height };
    } catch (e2) {
      console.warn('Blob URL strategy failed, falling back to previewUrl:', e2);
    }
  }

  // Strategy 3: Try previewUrl (which was already loaded previously in UI)
  if (imgItem.previewUrl) {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load preview for ${imgItem.name}`));
      img.src = imgItem.previewUrl;
    });
    const width = img.naturalWidth || img.width || imgItem.width || 800;
    const height = img.naturalHeight || img.height || imgItem.height || 600;
    return { source: img, width, height };
  }

  throw new Error(`Failed to load image: ${imgItem.name}`);
}

// Convert image file or preview URL with optional rotation to canvas data URL with controlled quality
async function processImageToDataUrl(
  imgItem: SelectedImage,
  qualityFactor: number,
  maxDimension: number
): Promise<{ dataUrl: string; width: number; height: number; format: 'JPEG' }> {
  const { source, width: origW, height: origH } = await loadDrawableSource(imgItem);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  const rotation = ((imgItem.rotation % 360) + 360) % 360;
  const isRotated90or270 = rotation === 90 || rotation === 270;

  // Scale down if larger than max dimension for performance and reasonable PDF sizing
  let scale = 1;
  if (origW > maxDimension || origH > maxDimension) {
    scale = Math.min(maxDimension / origW, maxDimension / origH);
  }

  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  if (isRotated90or270) {
    canvas.width = targetH;
    canvas.height = targetW;
  } else {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  // Fill white background for transparent or empty regions
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

  ctx.drawImage(source, 0, 0, targetW, targetH);
  ctx.restore();

  const dataUrl = canvas.toDataURL('image/jpeg', qualityFactor);
  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    format: 'JPEG',
  };
}

export async function generatePdf(
  images: SelectedImage[],
  settings: PdfSettings,
  onProgress?: ProgressCallback
): Promise<GeneratedPdfResult> {
  if (images.length === 0) {
    throw new Error('No images selected to generate PDF');
  }

  // PDF Quality configurations
  // Standard: smaller file size (0.65 quality, max 1600px)
  // High: balanced quality and size (0.82 quality, max 2400px)
  // Best: highest practical image quality (0.95 quality, max 3600px)
  let qualityFactor = 0.82;
  let maxDimension = 2400;

  if (settings.quality === 'standard') {
    qualityFactor = 0.65;
    maxDimension = 1600;
  } else if (settings.quality === 'best') {
    qualityFactor = 0.95;
    maxDimension = 3600;
  } else {
    qualityFactor = 0.82;
    maxDimension = 2400;
  }

  let doc: jsPDF | null = null;

  for (let i = 0; i < images.length; i++) {
    const imgItem = images[i];
    if (onProgress) {
      onProgress(i + 1, images.length, imgItem.name);
    }

    // Yield to browser event loop to let UI render progress
    await new Promise((resolve) => setTimeout(resolve, 25));

    const { dataUrl, width: imgW, height: imgH, format } = await processImageToDataUrl(
      imgItem,
      qualityFactor,
      maxDimension
    );

    // Determine page size and orientation for this page
    let pageOrientation: 'p' | 'l' = 'p';
    if (settings.orientation === 'portrait') {
      pageOrientation = 'p';
    } else if (settings.orientation === 'landscape') {
      pageOrientation = 'l';
    } else {
      // Auto orientation based on image aspect ratio
      pageOrientation = imgW > imgH ? 'l' : 'p';
    }

    let pageWidthMm = 210;
    let pageHeightMm = 297;
    let formatArg: string | [number, number] = 'a4';

    if (settings.pageSize === 'letter') {
      pageWidthMm = pageOrientation === 'l' ? 279.4 : 215.9;
      pageHeightMm = pageOrientation === 'l' ? 215.9 : 279.4;
      formatArg = 'letter';
    } else if (settings.pageSize === 'original') {
      // Custom dimensions matching exact image aspect ratio
      const standardWidthMm = 210;
      pageWidthMm = standardWidthMm;
      pageHeightMm = (imgH / imgW) * standardWidthMm;
      pageOrientation = pageWidthMm > pageHeightMm ? 'l' : 'p';
      formatArg = [pageWidthMm, pageHeightMm];
    } else {
      // Default A4
      pageWidthMm = pageOrientation === 'l' ? 297 : 210;
      pageHeightMm = pageOrientation === 'l' ? 210 : 297;
      formatArg = 'a4';
    }

    // Initialize document on first page, or add new page
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

    // Calculate margins
    let marginMm = 0;
    if (settings.margin === 'small') marginMm = 6;
    if (settings.margin === 'medium') marginMm = 14;

    const printableWidth = Math.max(10, pageWidthMm - marginMm * 2);
    const printableHeight = Math.max(10, pageHeightMm - marginMm * 2);

    const imgRatio = imgW / imgH;
    const printableRatio = printableWidth / printableHeight;

    let finalDataUrl = dataUrl;
    let posX = marginMm;
    let posY = marginMm;
    let finalW = printableWidth;
    let finalH = printableHeight;

    if (settings.pageSize === 'original') {
      // Original size mode: full bleed / exact fit
      finalW = pageWidthMm;
      finalH = pageHeightMm;
      posX = 0;
      posY = 0;
    } else if (settings.imageFit === 'fill') {
      // Fill Page: Scale to cover entire printable page, center-cropping excess without distortion
      if (Math.abs(imgRatio - printableRatio) > 0.005) {
        const cropCanvas = document.createElement('canvas');
        let sWidth = imgW;
        let sHeight = imgH;
        let sx = 0;
        let sy = 0;

        if (imgRatio > printableRatio) {
          // Image is wider than page ratio -> crop left and right
          sWidth = Math.max(1, Math.round(imgH * printableRatio));
          sx = Math.max(0, Math.round((imgW - sWidth) / 2));
        } else {
          // Image is taller than page ratio -> crop top and bottom
          sHeight = Math.max(1, Math.round(imgW / printableRatio));
          sy = Math.max(0, Math.round((imgH - sHeight) / 2));
        }

        cropCanvas.width = sWidth;
        cropCanvas.height = sHeight;
        const cropCtx = cropCanvas.getContext('2d');

        if (cropCtx) {
          const tempImg = new Image();
          await new Promise<void>((resolve, reject) => {
            tempImg.onload = () => resolve();
            tempImg.onerror = () => reject(new Error('Image crop decode failed'));
            tempImg.src = dataUrl;
          });
          cropCtx.drawImage(tempImg, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
          finalDataUrl = cropCanvas.toDataURL('image/jpeg', qualityFactor);
        }
      }
      finalW = printableWidth;
      finalH = printableHeight;
      posX = marginMm;
      posY = marginMm;
    } else {
      // Fit to Page (Default): Scale proportionally so entire image is visible, centered on page
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

    doc!.addImage(finalDataUrl, format, posX, posY, finalW, finalH, undefined, 'FAST');
  }

  if (!doc) {
    throw new Error('Failed to generate PDF document');
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
