import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Share2,
  PlusCircle,
  FileText,
  Eye,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { GeneratedPdfResult } from '../types';

interface SuccessScreenProps {
  result: GeneratedPdfResult;
  onCreateAnother: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ result, onCreateAnother }) => {
  const [copied, setCopied] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  // Trigger Save / Download file
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Android / Web Share API Handler
  const handleShare = async () => {
    try {
      const file = new File([result.blob], result.fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: result.fileName,
          text: `Here is the PDF document: ${result.fileName}`,
        });
        return;
      } else if (navigator.share) {
        const shareData: ShareData = {
          title: result.fileName,
          text: `Converted PDF with ${result.pageCount} page(s): ${result.fileName}`,
        };
        if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
          shareData.url = window.location.href;
        }
        await navigator.share(shareData);
        return;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Fallback to downloading or copying
        handleDownload();
        setShareNotice('Saved to your device!');
        setTimeout(() => setShareNotice(null), 3000);
        return;
      }
      return;
    }

    // Fallback if sharing is not supported by browser
    handleDownload();
    setShareNotice('PDF downloaded to your device for sharing!');
    setTimeout(() => setShareNotice(null), 3000);
  };

  const handleOpenInNewTab = () => {
    window.open(result.url, '_blank');
  };

  return (
    <div className="w-full max-w-md mx-auto py-2 space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Success Card */}
      <div className="bg-white rounded-[32px] p-7 border border-gray-100 shadow-sm text-center">
        {/* Theme Green Checkmark */}
        <div className="mx-auto w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          PDF Created!
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          Your document is ready for download or sharing.
        </p>

        {/* File Details Box */}
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

          {/* Action Buttons styled like the theme */}
          <div className="space-y-3">
            {/* Primary Action Grid: Save / Download & Open PDF */}
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

            {/* Secondary Action Grid: Share & Preview Toggle */}
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
              <div className="text-xs text-emerald-700 bg-emerald-50 py-2.5 px-3 rounded-xl font-medium animate-in fade-in">
                {shareNotice}
              </div>
            )}
          </div>
      </div>

      {/* Embedded PDF Preview if toggled */}
      {showViewer && (
        <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-gray-700">PDF Preview</span>
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>Full Window</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <div className="w-full h-80 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
            <iframe
              src={result.url}
              title="PDF Document Preview"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}

      {/* Create Another PDF Button */}
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

