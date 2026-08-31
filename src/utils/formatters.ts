export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function generateDefaultPdfFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `FastPDF_${year}-${month}-${day}_${hours}${minutes}.pdf`;
}

export function sanitizeFileName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return generateDefaultPdfFileName();
  }
  const clean = trimmed.replace(/[\\/:*?"<>|]/g, '_');
  return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`;
}

export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const tryLoad = (srcUrl: string, isObjectUrl: boolean) => {
      const img = new Image();
      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width || 800;
          const origH = img.naturalHeight || img.height || 600;

          // Generate a memory-efficient lightweight thumbnail for UI preview (max 480px)
          const maxThumbDim = 480;
          let thumbW = origW;
          let thumbH = origH;

          if (origW > maxThumbDim || origH > maxThumbDim) {
            const ratio = Math.min(maxThumbDim / origW, maxThumbDim / origH);
            thumbW = Math.max(1, Math.round(origW * ratio));
            thumbH = Math.max(1, Math.round(origH * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = thumbW;
          canvas.height = thumbH;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(img, 0, 0, thumbW, thumbH);
            const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            if (isObjectUrl) URL.revokeObjectURL(srcUrl);
            resolve({
              width: origW,
              height: origH,
              previewUrl: thumbDataUrl,
            });
            return;
          }
        } catch {
          // Ignore canvas errors and fall through to using srcUrl
        }
        resolve({
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
          previewUrl: srcUrl,
        });
      };

      img.onerror = () => {
        if (isObjectUrl) {
          URL.revokeObjectURL(srcUrl);
          // Try fallback to FileReader
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              tryLoad(reader.result, false);
            } else {
              reject(new Error(`Failed to load image: ${file.name}`));
            }
          };
          reader.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
          reader.readAsDataURL(file);
        } else {
          reject(new Error(`Failed to load image: ${file.name}`));
        }
      };

      img.src = srcUrl;
    };

    try {
      const objUrl = URL.createObjectURL(file);
      tryLoad(objUrl, true);
    } catch {
      // Direct FileReader fallback if createObjectURL is unavailable
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          tryLoad(reader.result, false);
        } else {
          reject(new Error(`Failed to read image file: ${file.name}`));
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read image file: ${file.name}`));
      reader.readAsDataURL(file);
    }
  });
}
