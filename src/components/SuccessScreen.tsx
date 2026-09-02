import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Share2,
  FileText,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { GeneratedPdfResult } from '../types';

interface SuccessScreenProps {
  result: GeneratedPdfResult;
  onCreateAnother: () => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ result, onCreateAnother }) => {
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const handleDownload = async () => {
    try {
      const base64 = await blobToBase64(result.blob);
      if ((window as any).AndroidApp?.handlePdfAction) {
        (window as any).AndroidApp.handlePdfAction(base64, result.fileName, 'save');
      } else {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      setShareNotice('Failed to process download.');
    }
  };

  const handleOpenInNewTab = async () => {
    try {
      const base64 = await blobToBase64(result.blob);
      if ((window as any).AndroidApp?.handlePdfAction) {
        (window as any).AndroidApp.handlePdfAction(base64, result.fileName, 'open');
      } else {
        window.open(result.url, '_blank');
      }
    } catch {
      setShareNotice('Failed to open PDF.');
    }
  };

  const handleShare = async () => {
    try {
      const base64 = await blobToBase64(result.blob);
      if ((window as any).AndroidApp?.handlePdfAction) {
        (window as any).AndroidApp.handlePdfAction(base64, result.fileName, 'share');
      } else if (navigator.share) {
        const file = new File([result.blob], result.fileName, { type: 'application/pdf' });
        await navigator.share({ files: [file], title: result.fileName });
      }
    } catch {
      setShareNotice('Share could not be opened.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-2 space-y-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-[32px] p-7 border border-gray-100 shadow-sm text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          PDF Created!
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Your document is ready for download or sharing.
        </p>

        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 mb-6 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 truncate" title={result.fileName}>
                {result.fileName}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-1 font-mono">
                <span>{result.pageCount} {result.pageCount === 1 ? 'Page' : 'Pages'}</span>
                <span>•</span>
                <span>{result.sizeFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              id="btn-save-pdf"
              type="button"
              onClick={handleDownload}
              className="w-full py-3.5 px-5 rounded-2xl bg-gray-900 hover:bg-black active:bg-gray-800 text-white font-bold text-xs shadow-md shadow-gray-900/10 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Save / Download</span>
            </button>

            <button
              id="btn-open-pdf"
              type="button"
              onClick={handleOpenInNewTab}
              className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="btn-share-pdf"
              type="button"
              onClick={handleShare}
              className="py-3.5 px-4 rounded-2xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-gray-600" />
              <span>Share File</span>
            </button>

            <button
              id="btn-preview-toggle"
              type="button"
              onClick={() => setShowViewer(!showViewer)}
              className="py-3.5 px-4 rounded-2xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-gray-600" />
              <span>{showViewer ? 'Hide Preview' : 'Preview'}</span>
            </button>
          </div>

          {shareNotice && (
            <div className="text-xs text-rose-700 bg-rose-50 py-2.5 px-3 rounded-xl font-medium animate-in fade-in">
              {shareNotice}
            </div>
          )}
        </div>
      </div>

      {showViewer && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm animate-in fade-in duration-200 text-center">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-700">PDF Preview</span>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Open in Full Viewer</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="py-8 px-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2">
            <FileText className="w-8 h-8 text-blue-500" />
            <p className="text-xs font-semibold text-gray-700">{result.fileName}</p>
            <p className="text-[11px] text-gray-400">Tap below to view full multi-page document cleanly in your PDF reader</p>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="mt-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Open Full Document
            </button>
          </div>
        </div>
      )}

      <button
        id="btn-create-another-pdf"
        type="button"
        onClick={onCreateAnother}
        className="w-full py-3.5 text-blue-600 hover:text-blue-700 active:text-blue-800 font-bold text-sm transition-colors text-center block"
      >
        + Convert More Images
      </button>
    </div>
  );
};
