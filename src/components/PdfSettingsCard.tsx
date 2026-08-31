import React from 'react';
import { Settings2, FileText, Maximize2, Sparkles, Check } from 'lucide-react';
import { PdfSettings, PageSizeOption, ImageFitOption, QualityOption } from '../types';

interface PdfSettingsCardProps {
  settings: PdfSettings;
  onUpdateSettings: (settings: Partial<PdfSettings>) => void;
  onOpenAdvancedModal?: () => void;
}

export const PdfSettingsCard: React.FC<PdfSettingsCardProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const pageSizeOptions: { id: PageSizeOption; label: string; subLabel: string }[] = [
    { id: 'a4', label: 'A4', subLabel: 'Standard (Default)' },
    { id: 'letter', label: 'Letter', subLabel: 'US Letter' },
    { id: 'original', label: 'Original', subLabel: 'Match Image Size' },
  ];

  const fitOptions: { id: ImageFitOption; label: string; desc: string }[] = [
    { id: 'fit', label: 'Fit to Page', desc: 'Proportional, no distortion' },
    { id: 'fill', label: 'Fill Page', desc: 'Covers full page' },
  ];

  const qualityOptions: { id: QualityOption; label: string; desc: string }[] = [
    { id: 'standard', label: 'Standard', desc: 'Smaller size' },
    { id: 'high', label: 'High', desc: 'Balanced (Default)' },
    { id: 'best', label: 'Best', desc: 'Highest clarity' },
  ];

  return (
    <div
      id="pdf-settings-card"
      className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-none">PDF Settings</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Customize output format & quality</p>
          </div>
        </div>
      </div>

      {/* Setting 1: Page Size */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Page Size</span>
          </label>
          <span className="text-[11px] font-medium text-gray-400">
            {settings.pageSize === 'a4'
              ? 'A4 (210×297mm)'
              : settings.pageSize === 'letter'
              ? 'US Letter (8.5×11")'
              : 'Original Image Size'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {pageSizeOptions.map((opt) => (
            <button
              key={opt.id}
              id={`setting-page-size-${opt.id}`}
              type="button"
              onClick={() => onUpdateSettings({ pageSize: opt.id })}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[50px] ${
                settings.pageSize === opt.id
                  ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-1 ring-blue-600 font-bold shadow-2xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium'
              }`}
            >
              <span className="text-xs">{opt.label}</span>
              <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.subLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Setting 2: Image Fit */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Image Fit</span>
          </label>
          <span className="text-[11px] font-medium text-gray-400">
            {settings.imageFit === 'fit' ? 'Fit to Page (No crop)' : 'Fill Page (Cover)'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {fitOptions.map((opt) => (
            <button
              key={opt.id}
              id={`setting-image-fit-${opt.id}`}
              type="button"
              onClick={() => onUpdateSettings({ imageFit: opt.id })}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[50px] ${
                settings.imageFit === opt.id
                  ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-1 ring-blue-600 font-bold shadow-2xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium'
              }`}
            >
              <span className="text-xs">{opt.label}</span>
              <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Setting 3: PDF Quality */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>PDF Quality</span>
          </label>
          <span className="text-[11px] font-medium text-gray-400 capitalize">
            {settings.quality} Quality
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {qualityOptions.map((opt) => (
            <button
              key={opt.id}
              id={`setting-quality-${opt.id}`}
              type="button"
              onClick={() => onUpdateSettings({ quality: opt.id })}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[50px] ${
                settings.quality === opt.id
                  ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-1 ring-blue-600 font-bold shadow-2xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium'
              }`}
            >
              <span className="text-xs">{opt.label}</span>
              <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
