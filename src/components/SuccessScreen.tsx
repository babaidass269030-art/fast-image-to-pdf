import React, { useState } from 'react';
import { Download, Share2, CheckCircle2, ExternalLink, FileText, RotateCcw } from 'lucide-react';
import { GeneratedPdfResult } from '../types';

interface SuccessScreenProps {
  result: GeneratedPdfResult;
  onCreateAnother: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ result, onCreateAnother }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const executeAndroidAction = async (action: 'download' | 'open' | 'share') => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const blob = result.blob ? result.blob : await (await fetch(result.url)).blob();
      const filename = result.fileName || 'FastPDF_Document.pdf';
      const androidApp = (window as any).AndroidApp;

      // 1. Native Android App Bridge
      if (androidApp && typeof androidApp.handlePdfAction === 'function') {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const resStr = (reader.result as string) || '';
            const base64Data = resStr.includes(',') ? resStr.split(',')[1] : resStr;
            androidApp.handlePdfAction(base64Data, filename, action);
          } catch (bridgeErr) {
            console.error('Android bridge call failed:', bridgeErr);
            triggerDownload(result.url, filename);
          } finally {
            setIsProcessing(false);
          }
        };
        reader.onerror = () => {
          triggerDownload(result.url, filename);
          setIsProcessing(false);
        };
        reader.readAsDataURL(blob);
        return;
      }

      // 2. Web Browser Fallbacks
      if (action === 'download') {
        const link = document.createElement('a');
        link.href = result.url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (action === 'open') {
        window.open(result.url, '_blank');
      } else if (action === 'share') {
        const pdfFile = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          try {
            await navigator.share({
              title: filename,
              files: [pdfFile],
            });
          } catch (shareErr: any) {
            if (shareErr.name !== 'AbortError') {
              console.warn('Native share failed, downloading instead:', shareErr);
              triggerDownload(result.url, filename);
            }
          }
        } else if (navigator.share) {
          try {
            await navigator.share({
              title: filename,
              url: result.url,
            });
          } catch (shareErr: any) {
            if (shareErr.name !== 'AbortError') {
              triggerDownload(result.url, filename);
            }
          }
        } else {
          // Standard browser without Web Share API: download the file
          triggerDownload(result.url, filename);
        }
      }
      setIsProcessing(false);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('Action error:', e);
      }
      setIsProcessing(false);
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">PDF Created!</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your document is ready.</p>

        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-700 flex items-center gap-3 text-left">
          <div className="p-2.5 bg-blue-100/70 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{result.fileName || 'Document.pdf'}</p>
            {result.sizeFormatted && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{result.sizeFormatted}</p>}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => executeAndroidAction('download')}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
          >
            <Download className="w-4 h-4" /> <span>{isProcessing ? 'Saving...' : 'Save / Download'}</span>
          </button>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => executeAndroidAction('open')}
              disabled={isProcessing}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
            >
              <ExternalLink className="w-4 h-4" /> <span>Open PDF</span>
            </button>
            <button
              onClick={() => executeAndroidAction('share')}
              disabled={isProcessing}
              className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" /> <span>Share File</span>
            </button>
          </div>
        </div>
      </div>
      <button
        onClick={onCreateAnother}
        className="w-full py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer active:scale-[0.98]"
      >
        <RotateCcw className="w-4 h-4" /> <span>+ Convert More</span>
      </button>
    </div>
  );
};
