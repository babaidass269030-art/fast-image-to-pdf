export interface SelectedImage {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  sizeBytes: number;
  previewUrl: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
}

export type PageSizeOption = 'a4' | 'letter' | 'original';
export type ImageFitOption = 'fit' | 'fill';
export type QualityOption = 'standard' | 'high' | 'best';
export type OrientationOption = 'auto' | 'portrait' | 'landscape';
export type MarginOption = 'none' | 'small' | 'medium';

export interface PdfSettings {
  fileName: string;
  pageSize: PageSizeOption;
  imageFit: ImageFitOption;
  quality: QualityOption;
  orientation: OrientationOption;
  margin: MarginOption;
}

export interface ProgressState {
  isGenerating: boolean;
  currentStep: number;
  totalSteps: number;
  currentImageName: string;
  percentage: number;
  errorMessage: string | null;
}

export interface GeneratedPdfResult {
  blob: Blob;
  url: string;
  fileName: string;
  sizeFormatted: string;
  sizeBytes: number;
  pageCount: number;
  createdAt: string;
}
