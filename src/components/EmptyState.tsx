import React, { useRef } from 'react';
import { UploadCloud, Camera, Image as ImageIcon } from 'lucide-react';

interface EmptyStateProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onNotice: (msg: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onFilesSelected, onNotice }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = ''; // Reset input for next time
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 animate-fadeIn">
      <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
        <UploadCloud className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Create PDF from Images</h2>
      <p className="text-slate-500 text-center max-w-sm mb-8 text-sm">
        Fast, secure, and 100% on-device. Your files never leave your phone.
      </p>

      <div className="flex flex-col sm:flex-row w-full max-w-xs gap-3">
        {/* গ্যালারি বাটন */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm cursor-pointer"
        >
          <ImageIcon className="w-5 h-5" />
          <span>Choose Photos</span>
        </button>

        {/* লাইভ ক্যামেরা বাটন */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full py-3.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm cursor-pointer"
        >
          <Camera className="w-5 h-5" />
          <span>Take Photo</span>
        </button>
      </div>

      {/* Hidden Inputs (These do the actual work) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
        id="add-more-file-input"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
    </div>
  );
};
