/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { SelectedImage, PdfSettings, ProgressState, GeneratedPdfResult } from './types';
import { formatFileSize, generateId, getImageDimensions, generateDefaultPdfFileName } from './utils/formatters';
import { generatePdf } from './utils/pdfGenerator';
import { showStartIoInterstitial } from './utils/startIoBridge';
import { Header } from './components/Header';
import { EmptyState } from './components/EmptyState';
import { ImageGrid } from './components/ImageGrid';
import { PdfOptionsModal } from './components/PdfOptionsModal';
import { ProgressModal } from './components/ProgressModal';
import { SuccessScreen } from './components/SuccessScreen';
import { AboutModal } from './components/AboutModal';
import { StartIoBanner } from './components/StartIoBanner';
import { FileText, ArrowRight, AlertCircle, Info, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [settings, setSettings] = useState<PdfSettings>({
    fileName: '',
    pageSize: 'a4',
    imageFit: 'fit',
    quality: 'high',
    orientation: 'auto',
    margin: 'none',
  });
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [aboutInitialTab, setAboutInitialTab] = useState<'about' | 'privacy' | 'feedback'>('about');
  const [progress, setProgress] = useState<ProgressState>({
    isGenerating: false,
    currentStep: 0,
    totalSteps: 0,
    currentImageName: '',
    percentage: 0,
    errorMessage: null,
  });
  const [successResult, setSuccessResult] = useState<GeneratedPdfResult | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  const showToast = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const handleOpenAbout = (tab: 'about' | 'privacy' | 'feedback' = 'about') => {
    setAboutInitialTab(tab);
    setIsAboutOpen(true);
  };

  // Add multiple files from device file picker or drop zone
  const handleAddFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (file) =>
        file.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|bmp|gif|tiff?|heic|heif|svg)$/i.test(file.name) ||
        !file.type
    );

    if (fileArray.length === 0) {
      showToast('No valid image files found. Please select JPG, PNG, or WebP images.', 'error');
      return;
    }

    try {
      const newItems: SelectedImage[] = [];

      for (const file of fileArray) {
        try {
          const { width, height, previewUrl } = await getImageDimensions(file);
          newItems.push({
            id: generateId(),
            file,
            name: file.name || `image_${Date.now()}.jpg`,
            sizeFormatted: formatFileSize(file.size),
            sizeBytes: file.size,
            previewUrl,
            width,
            height,
            rotation: 0,
          });
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
        }
      }

      if (newItems.length > 0) {
        setImages((prev) => [...prev, ...newItems]);
        showToast(`Added ${newItems.length} image${newItems.length > 1 ? 's' : ''}`, 'success');
      } else {
        showToast('Could not load selected images. Please try selecting different files.', 'error');
      }
    } catch {
      showToast('Error processing some images. Please try again.', 'error');
    }
  }, []);

  // Remove single image
  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const itemToRemove = prev.find((item) => item.id === id);
      if (itemToRemove && itemToRemove.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Rotate image 90 degrees clockwise
  const handleRotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img))
    );
  };

  // Reorder images via drag-and-drop or programmatic shift
  const handleReorder = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) return;
    setImages((prev) => {
      if (sourceIndex >= prev.length || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });
  };

  // Move image earlier in order
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    handleReorder(index, index - 1);
  };

  // Move image later in order
  const handleMoveDown = (index: number) => {
    if (index >= images.length - 1) return;
    handleReorder(index, index + 1);
  };

  // Clear all selected images
  const handleClearAll = () => {
    images.forEach((img) => {
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setImages([]);
  };

  // Update PDF settings
  const handleUpdateSettings = (partial: Partial<PdfSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  // Generate PDF from selected images
  const handleCreatePdf = async () => {
    if (images.length === 0) {
      showToast('Please select at least one image to create a PDF.', 'error');
      return;
    }

    setProgress({
      isGenerating: true,
      currentStep: 0,
      totalSteps: images.length,
      currentImageName: 'Preparing images...',
      percentage: 5,
      errorMessage: null,
    });

    try {
      const result = await generatePdf(images, settings, (current, total, imageName) => {
        const pct = Math.min(95, Math.round((current / total) * 90) + 5);
        setProgress({
          isGenerating: true,
          currentStep: current,
          totalSteps: total,
          currentImageName: imageName,
          percentage: pct,
          errorMessage: null,
        });
      });

      // Complete progress
      setProgress((prev) => ({ ...prev, percentage: 100 }));
      await new Promise((r) => setTimeout(r, 150));

      setProgress({
        isGenerating: false,
        currentStep: 0,
        totalSteps: 0,
        currentImageName: '',
        percentage: 0,
        errorMessage: null,
      });

      setSuccessResult(result);

      // পিডিএফ সফলভাবে তৈরি হওয়ার পর নিশ্চিত ইন্টারস্টিশিয়াল বিজ্ঞাপন ট্রিগার
      try {
        showStartIoInterstitial();
      } catch (adError) {
        console.error('Ad display error:', adError);
      }

    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setProgress({
        isGenerating: false,
        currentStep: 0,
        totalSteps: 0,
        currentImageName: '',
        percentage: 0,
        errorMessage: err.message || 'Failed to generate PDF',
      });
      showToast(err.message || 'Failed to create PDF. Please try again.', 'error');
    }
  };

  // Start fresh conversion
  const handleCreateAnother = () => {
    if (successResult?.url) {
      URL.revokeObjectURL(successResult.url);
    }
    // Safe trigger for native interstitial on natural flow completion
    showStartIoInterstitial();

    setSuccessResult(null);
    handleClearAll();
    setSettings({
      fileName: '',
      pageSize: 'a4',
      imageFit: 'fit',
      quality: 'high',
      orientation: 'auto',
      margin: 'none',
    });
  };

  const totalSizeBytes = images.reduce((acc, curr) => acc + curr.sizeBytes, 0);
  const totalSizeFormatted = formatFileSize(totalSizeBytes);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-gray-900 font-sans antialiased selection:bg-blue-100">
      {/* App Header */}
      <Header
        imageCount={images.length}
        onClearAll={images.length > 0 && !successResult ? handleClearAll : undefined}
        onSelectMore={
          images.length > 0 && !successResult
            ? () => {
                const el = document.getElementById('add-more-file-input') as HTMLInputElement;
                if (el) el.click();
              }
            : undefined
        }
        onOpenAbout={() => handleOpenAbout('about')}
      />

      {/* Main Screen Container */}
      <main className="flex-1 w-full max-w-xl mx-auto p-4 sm:p-5 flex flex-col justify-start">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            id="app-toast-banner"
            className={`mb-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-gray-400 hover:text-gray-700 ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Switching */}
        {successResult ? (
          /* Success Screen */
          <SuccessScreen result={successResult} onCreateAnother={handleCreateAnother} />
        ) : images.length === 0 ? (
          /* Clean Empty State */
          <EmptyState
            onFilesSelected={handleAddFiles}
            onNotice={(msg) => showToast(msg, 'info')}
          />
        ) : (
          /* List of Selected Images */
          <ImageGrid
            images={images}
            totalSizeFormatted={totalSizeFormatted}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onSelectMoreFiles={handleAddFiles}
            onRemove={handleRemoveImage}
            onRotate={handleRotateImage}
            onReorder={handleReorder}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onClearAll={handleClearAll}
            onOpenSettingsModal={() => setIsOptionsOpen(true)}
          />
        )}

        {/* Dedicated Start.io Non-Intrusive Banner Area */}
        <StartIoBanner isVisible={!successResult} />

        {/* Subtle Footer with Privacy Policy & About Links */}
        <footer className="mt-8 mb-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-[11px] text-gray-400 gap-2">
          <span>Fast PDF • 100% On-Device</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenAbout('privacy')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenAbout('about')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              About
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenAbout('feedback')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Feedback
            </button>
          </div>
        </footer>
      </main>

      {/* Floating Bottom Action Bar when images are loaded */}
      {!successResult && images.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 shadow-xl">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <button
              id="btn-create-pdf"
              type="button"
              disabled={images.length === 0 || progress.isGenerating}
              onClick={handleCreatePdf}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2.5 text-sm transition-all transform active:scale-[0.98] cursor-pointer"
            >
              <FileText className="w-4 h-4 stroke-[2.25]" />
              <span>Create PDF ({images.length} {images.length === 1 ? 'image' : 'images'})</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* PDF Settings Modal */}
      <PdfOptionsModal
        isOpen={isOptionsOpen}
        settings={settings}
        onClose={() => setIsOptionsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* PDF Conversion Progress Modal */}
      <ProgressModal progress={progress} />

      {/* About & Privacy Policy Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        defaultTab={aboutInitialTab}
      />
    </div>
  );
}
      if (itemToRemove && itemToRemove.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Rotate image 90 degrees clockwise
  const handleRotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img))
    );
  };

  // Reorder images via drag-and-drop or programmatic shift
  const handleReorder = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) return;
    setImages((prev) => {
      if (sourceIndex >= prev.length || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });
  };

  // Move image earlier in order
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    handleReorder(index, index - 1);
  };

  // Move image later in order
  const handleMoveDown = (index: number) => {
    if (index >= images.length - 1) return;
    handleReorder(index, index + 1);
  };

  // Clear all selected images
  const handleClearAll = () => {
    images.forEach((img) => {
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setImages([]);
  };

  // Update PDF settings
  const handleUpdateSettings = (partial: Partial<PdfSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  // Generate PDF from selected images
  const handleCreatePdf = async () => {
    if (images.length === 0) {
      showToast('Please select at least one image to create a PDF.', 'error');
      return;
    }

    setProgress({
      isGenerating: true,
      currentStep: 0,
      totalSteps: images.length,
      currentImageName: 'Preparing images...',
      percentage: 5,
      errorMessage: null,
    });

    try {
      const result = await generatePdf(images, settings, (current, total, imageName) => {
        const pct = Math.min(95, Math.round((current / total) * 90) + 5);
        setProgress({
          isGenerating: true,
          currentStep: current,
          totalSteps: total,
          currentImageName: imageName,
          percentage: pct,
          errorMessage: null,
        });
      });

      // Complete progress
      setProgress((prev) => ({ ...prev, percentage: 100 }));
      await new Promise((r) => setTimeout(r, 150));

      setProgress({
        isGenerating: false,
        currentStep: 0,
        totalSteps: 0,
        currentImageName: '',
        percentage: 0,
        errorMessage: null,
      });

      setSuccessResult(result);

      // পিডিএফ সফলভাবে তৈরি হওয়ার পর নিশ্চিত ইন্টারস্টিশিয়াল বিজ্ঞাপন ট্রিগার
      try {
        showStartIoInterstitial();
      } catch (adError) {
        console.error('Ad display error:', adError);
      }

    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setProgress({
        isGenerating: false,
        currentStep: 0,
        totalSteps: 0,
        currentImageName: '',
        percentage: 0,
        errorMessage: err.message || 'Failed to generate PDF',
      });
      showToast(err.message || 'Failed to create PDF. Please try again.', 'error');
    }
  };

  // Start fresh conversion
  const handleCreateAnother = () => {
    if (successResult?.url) {
      URL.revokeObjectURL(successResult.url);
    }
    // Safe trigger for native interstitial on natural flow completion
    showStartIoInterstitial();

    setSuccessResult(null);
    handleClearAll();
    setSettings({
      fileName: '',
      pageSize: 'a4',
      imageFit: 'fit',
      quality: 'high',
      orientation: 'auto',
      margin: 'none',
    });
  };

  const totalSizeBytes = images.reduce((acc, curr) => acc + curr.sizeBytes, 0);
  const totalSizeFormatted = formatFileSize(totalSizeBytes);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-gray-900 font-sans antialiased selection:bg-blue-100">
      {/* App Header */}
      <Header
        imageCount={images.length}
        onClearAll={images.length > 0 && !successResult ? handleClearAll : undefined}
        onSelectMore={
          images.length > 0 && !successResult
            ? () => {
                const el = document.getElementById('add-more-file-input') as HTMLInputElement;
                if (el) el.click();
              }
            : undefined
        }
        onOpenAbout={() => handleOpenAbout('about')}
      />

      {/* Main Screen Container */}
      <main className="flex-1 w-full max-w-xl mx-auto p-4 sm:p-5 flex flex-col justify-start">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            id="app-toast-banner"
            className={`mb-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-gray-400 hover:text-gray-700 ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Switching */}
        {successResult ? (
          /* Success Screen */
          <SuccessScreen result={successResult} onCreateAnother={handleCreateAnother} />
        ) : images.length === 0 ? (
          /* Clean Empty State */
          <EmptyState
            onFilesSelected={handleAddFiles}
            onNotice={(msg) => showToast(msg, 'info')}
          />
        ) : (
          /* List of Selected Images */
          <ImageGrid
            images={images}
            totalSizeFormatted={totalSizeFormatted}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onSelectMoreFiles={handleAddFiles}
            onRemove={handleRemoveImage}
            onRotate={handleRotateImage}
            onReorder={handleReorder}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onClearAll={handleClearAll}
            onOpenSettingsModal={() => setIsOptionsOpen(true)}
          />
        )}

        {/* Dedicated Start.io Non-Intrusive Banner Area */}
        <StartIoBanner isVisible={!successResult} />

        {/* Subtle Footer with Privacy Policy & About Links */}
        <footer className="mt-8 mb-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-[11px] text-gray-400 gap-2">
          <span>Fast PDF • 100% On-Device</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenAbout('privacy')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenAbout('about')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              About
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenAbout('feedback')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Feedback
            </button>
          </div>
        </footer>
      </main>

      {/* Floating Bottom Action Bar when images are loaded */}
      {!successResult && images.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 shadow-xl">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <button
              id="btn-create-pdf"
              type="button"
              disabled={images.length === 0 || progress.isGenerating}
              onClick={handleCreatePdf}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2.5 text-sm transition-all transform active:scale-[0.98] cursor-pointer"
            >
              <FileText className="w-4 h-4 stroke-[2.25]" />
              <span>Create PDF ({images.length} {images.length === 1 ? 'image' : 'images'})</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* PDF Settings Modal */}
      <PdfOptionsModal
        isOpen={isOptionsOpen}
        settings={settings}
        onClose={() => setIsOptionsOpen(false)}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* PDF Conversion Progress Modal */}
      <ProgressModal progress={progress} />

      {/* About & Privacy Policy Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        defaultTab={aboutInitialTab}
      />
    </div>
  );
      }
        
