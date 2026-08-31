import React from 'react';
import { Trash2, ShieldCheck, Image as ImageIcon, Info } from 'lucide-react';

interface HeaderProps {
  imageCount: number;
  onClearAll?: () => void;
  onSelectMore?: () => void;
  onOpenAbout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  imageCount,
  onClearAll,
  onSelectMore,
  onOpenAbout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-xl mx-auto px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Fast PDF
              </h1>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                V1.0
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 uppercase tracking-widest font-semibold">
              Image to PDF Converter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {imageCount > 0 ? (
            <>
              {onSelectMore && (
                <button
                  id="btn-header-add-more"
                  type="button"
                  onClick={onSelectMore}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title="Add more images"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>+ Add</span>
                </button>
              )}
              {onClearAll && (
                <button
                  id="btn-header-clear-all"
                  type="button"
                  onClick={onClearAll}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title="Remove all selected images"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Local
            </span>
          )}

          {onOpenAbout && (
            <button
              id="btn-header-about"
              type="button"
              onClick={onOpenAbout}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              title="About & Privacy Policy"
              aria-label="About and Privacy Policy"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


