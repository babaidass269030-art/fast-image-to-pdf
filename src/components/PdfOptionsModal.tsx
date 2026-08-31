import React from 'react';
import { X, Check, Settings2, FileText, Maximize2, Sparkles } from 'lucide-react';
import { PdfSettings, PageSizeOption, ImageFitOption, QualityOption, OrientationOption } from '../types';

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

  const pageSizeOptions: { id: PageSizeOption; label: string; desc: string }[] = [
    { id: 'a4', label: 'A4 (Default)', desc: '210 × 297 mm (Most common format)' },
    { id: 'letter', label: 'US Letter', desc: '8.5 × 11 inches (North America standard)' },
    { id: 'original', label: 'Original Image Size', desc: 'Matches exact image aspect ratio' },
  ];

  const imageFitOptions: { id: ImageFitOption; label: string; desc: string }[] = [
    { id: 'fit', label: 'Fit to Page', desc: 'Scale proportionally, entire image visible' },
    { id: 'fill', label: 'Fill Page', desc: 'Cover entire page, crop without distortion' },
  ];

  const orientationOptions: { id: OrientationOption; label: string }[] = [
    { id: 'auto', label: 'Auto (Match Image)' },
    { id: 'portrait', label: 'Portrait' },
    { id: 'landscape', label: 'Landscape' },
  ];

  const qualityOptions: { id: QualityOption; label: string; desc: string }[] = [
    { id: 'standard', label: 'Standard', desc: 'Smaller file size, quick compression' },
    { id: 'high', label: 'High (Recommended)', desc: 'Balanced visual quality and file size' },
    { id: 'best', label: 'Best Quality', desc: 'Highest practical resolution for printing' },
  ];

  return (
    <div
      id="modal-pdf-options"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Settings2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900">PDF Settings</h3>
          </div>
          <button
            id="btn-close-pdf-options"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* File Name */}
          <div>
            <label htmlFor="modal-filename-input" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Custom Document Name (Optional)
            </label>
            <input
              id="modal-filename-input"
              type="text"
              value={settings.fileName}
              onChange={(e) => onUpdateSettings({ fileName: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              placeholder="e.g. FastPDF_2026-08-27_1430"
            />
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Page Size</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {pageSizeOptions.map((opt) => (
                <button
                  key={opt.id}
                  id={`opt-page-size-${opt.id}`}
                  type="button"
                  onClick={() => onUpdateSettings({ pageSize: opt.id })}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                    settings.pageSize === opt.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[11px] text-gray-400">{opt.desc}</div>
                  </div>
                  {settings.pageSize === opt.id && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Image Fit */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Image Fit</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {imageFitOptions.map((opt) => (
                <button
                  key={opt.id}
                  id={`opt-image-fit-${opt.id}`}
                  type="button"
                  onClick={() => onUpdateSettings({ imageFit: opt.id })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    settings.imageFit === opt.id
                      ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Orientation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {orientationOptions.map((opt) => (
                <button
                  key={opt.id}
                  id={`opt-orientation-${opt.id}`}
                  type="button"
                  onClick={() => onUpdateSettings({ orientation: opt.id })}
                  className={`p-2.5 rounded-xl border text-center transition-all text-xs font-medium ${
                    settings.orientation === opt.id
                      ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Compression */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>PDF Quality</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.id}
                  id={`opt-quality-${opt.id}`}
                  type="button"
                  onClick={() => onUpdateSettings({ quality: opt.id })}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settings.quality === opt.id
                      ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            id="btn-apply-pdf-options"
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm transition-colors shadow-md shadow-blue-500/20"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
