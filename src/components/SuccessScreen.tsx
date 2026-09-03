import React, { useState } from 'react';
import { Download, Share2, Eye, EyeOff, CheckCircle2, ExternalLink, FileText, RotateCcw } from 'lucide-react';
import { GeneratedPdfResult } from '../types';

interface SuccessScreenProps {
  result: GeneratedPdfResult;
  onCreateAnother: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ result, onCreateAnother }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // অ্যান্ড্রয়েড জাভা ব্রিজে একশন পাঠানো (Crash-proof)
  const executeAndroidAction = async (action: 'download' | 'open' | 'share') => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Blob URL থেকে Base64 এ কনভার্ট করে জাভাতে পাঠানো
      const response = await fetch(result.url);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        const androidApp = (window as any).AndroidApp;
        const filename = result.fileName || 'FastPDF_Document.pdf';

        if (androidApp && typeof androidApp.handlePdfAction === 'function') {
          androidApp.handlePdfAction(base64Data, filename, action);
        } else {
          // ব্রাউজার ফলব্যাক
          if (action === 'download') {
            const link = document.createElement('a');
            link.href = result.url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else if (action === 'open') {
            window.open(result.url, '_blank');
          }
        }
        setIsProcessing(false);
      };
      
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error('Error executing action:', e);
      alert('Action failed! Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">PDF Created!</h2>
        <p className="text-slate-500 text-sm mt-1">Your document is ready for download or sharing.</p>

        {/* ফাইল ইনফো কার্ড */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-3 text-left">
          <div className="p-2.5 bg-blue-100/70 text-blue-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{result.fileName || 'Document.pdf'}</p>
            {result.sizeFormatted && (
              <p className="text-xs text-slate-500 mt-0.5">{result.sizeFormatted}</p>
            )}
          </div>
        </div>

        {/* অ্যাকশন বাটনসমূহ */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => executeAndroidAction('download')}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-70 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>{isProcessing ? 'Saving...' : 'Save / Download'}</span>
          </button>

          <button
            onClick={() => executeAndroidAction('open')}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-70 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open PDF</span>
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => executeAndroidAction('share')}
              disabled={isProcessing}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Share File</span>
            </button>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* প্রিভিউ বক্স */}
      {showPreview && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <iframe
            src={result.url}
            title="PDF Preview"
            className="w-full h-80 rounded-xl border border-slate-200"
          />
        </div>
      )}

      {/* নতুন ছবি কনভার্ট করার বাটন */}
      <button
        onClick={onCreateAnother}
        className="w-full py-3.5 px-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-[0.99] font-medium rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
      >
        <RotateCcw className="w-4 h-4" />
        <span>+ Convert More Images</span>
      </button>
    </div>
  );
};
