import React, { useRef } from 'react';
import { Image as ImageIcon, Camera, Layers, ShieldCheck, Zap } from 'lucide-react';

export const EmptyState: React.FC<{ onFilesSelected: (files: FileList | File[]) => void }> = ({ onFilesSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 max-w-md w-full shadow-sm border border-slate-100 dark:border-slate-700 text-center mb-8">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
          <ImageIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Select Images to Convert</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Choose photos or documents from your device to merge them into a single high-quality PDF.</p>
        
        <div className="space-y-3">
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer">
            <ImageIcon className="w-5 h-5" /> Select Images
          </button>
          <button onClick={() => cameraInputRef.current?.click()} className="w-full py-4 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer">
            <Camera className="w-5 h-5" /> Take Photo
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
          <Layers className="w-6 h-6 text-blue-500 mb-2" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-white">Multi-Page</h4>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
          <ShieldCheck className="w-6 h-6 text-emerald-500 mb-2" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-white">100% Private</h4>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
          <Zap className="w-6 h-6 text-amber-500 mb-2" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-white">Fast & Crisp</h4>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && onFilesSelected(e.target.files)} accept="image/*" multiple className="hidden" />
      <input type="file" ref={cameraInputRef} onChange={(e) => e.target.files && onFilesSelected(e.target.files)} accept="image/*" capture="environment" className="hidden" />
    </div>
  );
};
