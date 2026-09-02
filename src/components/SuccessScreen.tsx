import React, { useState } from 'react';
import { 
  Download, 
  Share2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ExternalLink,
  FileText,
  RotateCcw
} from 'lucide-react';
import { GeneratedPdf } from '../types';

interface SuccessScreenProps {
  pdf: GeneratedPdf;
  onReset: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ pdf, onReset }) => {
  const [showPreview, setShowPreview] = useState(false);

  // অ্যান্ড্রয়েড জাভা ব্রিজে একশন পাঠানো
  const executeAndroidAction = (action: 'download' | 'open' | 'share') => {
    try {
      const base64Data = pdf.dataUrl.split(',')[1] || pdf.dataUrl;
      const androidApp = (window as any).AndroidApp;

      if (androidApp && typeof androidApp.handlePdfAction === 'function') {
        androidApp.handlePdfAction(base64Data, pdf.filename, action);
        return;
      }
    } catch (e) {
      console.error('Android bridge error:', e);
    }

    // ব্রাউজার ফলব্যাক
    if (action === 'download') {
      const link = document.createElement('a');
      link.href = pdf.dataUrl;
      link.download = pdf.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (action === 'open') {
      window.open(pdf.dataUrl, '_blank');
    } else if (action === 'share') {
      if (navigator.share) {
        fetch(pdf.dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], pdf.filename, { type: 'application/pdf' });
            navigator.share({ files: [file], title: pdf.filename });
          })
          .catch(() => alert('Sharing not supported on this browser'));
      } else {
        alert('Direct sharing not available');
      }
    }
  };

  // Convert More Images চাপলে ইন্টারস্টিশিয়াল অ্যাড দেখিয়ে রিসেট করা
  const handleCreateAnother = () => {
    try {
      const androidApp = (window as any).AndroidApp;
      if (androidApp && typeof androidApp.showInterstitial === 'function') {
        androidApp.showInterstitial();
      }
    } catch (e) {
      console.error('Interstitial trigger error:', e);
    }
    onReset();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* সাকসেস হেডার */}
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
            <p className="font-semibold text-slate-800 text-sm truncate">{pdf.filename}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {pdf.pageCount} Pages • {formatFileSize(pdf.size)}
            </p>
          </div>
        </div>

        {/* অ্যাকশন বাটনসমূহ */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => executeAndroidAction('download')}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Save / Download</span>
          </button>

          <button
            onClick={() => executeAndroidAction('open')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open PDF</span>
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => executeAndroidAction('share')}
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
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-semibold text-slate-700">PDF Preview</span>
            <button
              onClick={() => executeAndroidAction('open')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              Open in Full Viewer <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <iframe
            src={pdf.dataUrl}
            title="PDF Preview"
            className="w-full h-80 rounded-xl border border-slate-200"
          />
        </div>
      )}

      {/* নতুন ছবি কনভার্ট করার বাটন */}
      <button
        onClick={handleCreateAnother}
        className="w-full py-3.5 px-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-[0.99] font-medium rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
      >
        <RotateCcw className="w-4 h-4" />
        <span>+ Convert More Images</span>
      </button>
    </div>
  );
};
                
