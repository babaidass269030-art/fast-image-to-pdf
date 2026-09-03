import React from 'react';
import { X, FileEdit, Settings, Image as ImageIcon, FileText } from 'lucide-react';
import { PdfSettings } from '../types';

interface PdfOptionsModalProps {
  isOpen: boolean;
  settings: PdfSettings;
  onClose: () => void;
  onUpdateSettings: (settings: Partial<PdfSettings>) => void;
}

export const PdfOptionsModal: React.FC<PdfOptionsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-0 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg">PDF Settings</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          
          {/* ১. ফাইলের নাম দেওয়ার অপশন (Custom File Name) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileEdit className="w-4 h-4 text-slate-500" />
              PDF File Name
            </label>
            <input
              type="text"
              value={settings.fileName || ''}
              onChange={(e) => onUpdateSettings({ fileName: e.target.value })}
              placeholder="e.g. My_Document"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <p className="text-[11px] text-slate-400">Leave blank for default name (FastPDF_Date)</p>
          </div>

          {/* ২. পেজ সাইজ অপশন */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText className="w-4 h-4 text-slate-500" />
              Page Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['a4', 'letter', 'fit'].map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateSettings({ pageSize: size as any })}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                    settings.pageSize === size
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {size.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ৩. কোয়ালিটি অপশন */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ImageIcon className="w-4 h-4 text-slate-500" />
              Image Quality
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['low', 'medium', 'high'].map((q) => (
                <button
                  key={q}
                  onClick={() => onUpdateSettings({ quality: q as any })}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                    settings.quality === q
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
