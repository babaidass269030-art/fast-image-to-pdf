import React, { useRef, useState } from 'react';
import { ImagePlus, ShieldCheck, Zap, Layers, Sparkles, FolderUp } from 'lucide-react';

interface EmptyStateProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onNotice?: (msg: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onFilesSelected, onNotice }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      onNotice?.('Image selection was cancelled or no images were chosen.');
      return;
    }
    onFilesSelected(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      const validFiles = filesArray.filter((file) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length === 0) {
        onNotice?.('Please select valid image files (JPG, PNG, WebP, etc.).');
        return;
      }
      onFilesSelected(validFiles);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="image-file-input"
      />

      {/* Main Interactive Drop/Tap Zone */}
      <div
        id="drop-zone-empty"
        onClick={handleButtonClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-md cursor-pointer transition-all duration-200 rounded-[32px] p-8 text-center border-2 border-dashed ${
          isDragging
            ? 'border-blue-500 bg-blue-50/80 scale-[1.02] shadow-xl shadow-blue-500/10'
            : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50/50 shadow-sm'
        }`}
      >
        <div className="mx-auto w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 shadow-xs">
          <ImagePlus className="w-10 h-10 stroke-[1.75]" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Select Images to Convert
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-xs mx-auto">
          Choose photos or documents from your device gallery to merge them into a single high-quality PDF.
        </p>

        {/* Prominent Action Button */}
        <button
          id="btn-select-images-main"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleButtonClick();
          }}
          className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98]"
        >
          <FolderUp className="w-5 h-5" />
          <span>Select Images</span>
        </button>
        <p className="text-[11px] text-gray-400 mt-3">
          Tap anywhere or drag & drop • Multiple photos supported
        </p>
      </div>

      {/* Feature Highlights / Privacy badge */}
      <div className="w-full max-w-md mt-6 grid grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 text-center shadow-xs flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Multi-Page</span>
          <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">Order preserved</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 text-center shadow-xs flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">100% Private</span>
          <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">No server upload</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 text-center shadow-xs flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5">
            <Zap className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-gray-800">Fast & Crisp</span>
          <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">High DPI output</span>
        </div>
      </div>
    </div>
  );
};
