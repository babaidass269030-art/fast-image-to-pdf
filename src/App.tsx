/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SelectedImage, PdfSettings, ProgressState, GeneratedPdfResult } from './types';
import { formatFileSize, generateId, getImageDimensions } from './utils/formatters';
import { generatePdf } from './utils/pdfGenerator';
import { Header } from './components/Header';
import { EmptyState } from './components/EmptyState';
import { ImageGrid } from './components/ImageGrid';
import { PdfOptionsModal } from './components/PdfOptionsModal';
import { ProgressModal } from './components/ProgressModal';
import { SuccessScreen } from './components/SuccessScreen';
import { AboutModal } from './components/AboutModal';
import { FileText, ArrowRight, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
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
    isGenerating: false, currentStep: 0, totalSteps: 0, currentImageName: '', percentage: 0, errorMessage: null,
  });
  const [successResult, setSuccessResult] = useState<GeneratedPdfResult | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const showToast = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenAbout = (tab: 'about' | 'privacy' | 'feedback' = 'about') => {
    setAboutInitialTab(tab); setIsAboutOpen(true);
  };

  const handleAddFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name));
    if (fileArray.length === 0) return showToast('No valid images found.', 'error');

    try {
      const newItems: SelectedImage[] = [];
      for (const file of fileArray) {
        const { width, height, previewUrl } = await getImageDimensions(file);
        newItems.push({ id: generateId(), file, name: file.name, sizeFormatted: formatFileSize(file.size), sizeBytes: file.size, previewUrl, width, height, rotation: 0 });
      }
      setImages(prev => [...prev, ...newItems]);
    } catch {
      showToast('Error processing images.', 'error');
    }
  }, []);

  const handleRemoveImage = (id: string) => setImages(prev => prev.filter(img => img.id !== id));
  const handleClearAll = () => setImages([]);
  const handleUpdateSettings = (partial: Partial<PdfSettings>) => setSettings(prev => ({ ...prev, ...partial }));

  const handleRotateImage = (id: string) => {
    setImages(prev =>
      prev.map(img =>
        img.id === id
          ? { ...img, rotation: ((img.rotation + 90) % 360) as any }
          : img
      )
    );
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setImages(prev => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index - 1, 0, item);
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    setImages(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index + 1, 0, item);
      return next;
    });
  };

  const handleReorder = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;
    setImages(prev => {
      const next = [...prev];
      const [item] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const handleCreatePdf = async () => {
    if (images.length === 0) return;
    setProgress({ isGenerating: true, currentStep: 0, totalSteps: images.length, currentImageName: 'Preparing...', percentage: 5, errorMessage: null });

    try {
      const result = await generatePdf(images, settings, (c, t, n) => {
        setProgress({ isGenerating: true, currentStep: c, totalSteps: t, currentImageName: n, percentage: Math.min(95, Math.round((c / t) * 90) + 5), errorMessage: null });
      });
      setProgress(prev => ({ ...prev, percentage: 100 }));
      await new Promise(r => setTimeout(r, 150));
      setProgress({ isGenerating: false, currentStep: 0, totalSteps: 0, currentImageName: '', percentage: 0, errorMessage: null });
      
      // Full-screen Ad Trigger for Android WebView
      try {
        const androidApp = (window as any).AndroidApp;
        if (androidApp && typeof androidApp.showInterstitial === 'function') {
          androidApp.showInterstitial();
        }
      } catch (e) {
        console.error('Ad display error:', e);
      }

      setSuccessResult(result);
    } catch (err: any) {
      setProgress({ isGenerating: false, currentStep: 0, totalSteps: 0, currentImageName: '', percentage: 0, errorMessage: err.message });
      showToast('Failed to create PDF.', 'error');
    }
  };

  const handleCreateAnother = () => {
    setSuccessResult(null); handleClearAll();
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#F8FAFC] text-gray-900'} pb-20`}>
      <Header imageCount={images.length} onClearAll={images.length > 0 && !successResult ? handleClearAll : undefined} onOpenAbout={() => handleOpenAbout('about')} />
      
      {/* Dark Mode Toggle */}
      <div className="flex justify-end px-4 pt-4 max-w-xl mx-auto w-full">
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isDarkMode ? 'bg-slate-800 text-yellow-400 border border-slate-700' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'}`}>
          {isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      <main className="flex-1 w-full max-w-xl mx-auto p-4 flex flex-col justify-start">
        {successResult ? (
          <SuccessScreen
            result={successResult}
            onCreateAnother={handleCreateAnother}
          />
        ) : images.length === 0 ? (
          <EmptyState onFilesSelected={handleAddFiles} />
        ) : (
          <ImageGrid
            images={images}
            totalSizeFormatted={formatFileSize(images.reduce((a, c) => a + c.sizeBytes, 0))}
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
      </main>

      {!successResult && images.length > 0 && (
        <div className={`fixed bottom-0 inset-x-0 z-40 p-4 shadow-xl mb-12 backdrop-blur-md border-t ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-gray-100'}`}>
          <div className="max-w-xl mx-auto">
            <button onClick={handleCreatePdf} disabled={progress.isGenerating} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> <span>Create PDF ({images.length})</span> <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <PdfOptionsModal isOpen={isOptionsOpen} settings={settings} onClose={() => setIsOptionsOpen(false)} onUpdateSettings={handleUpdateSettings} />
      <ProgressModal progress={progress} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} defaultTab={aboutInitialTab} />
    </div>
  );
}
