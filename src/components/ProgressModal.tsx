import React from 'react';
import { Loader2, FileText, Sparkles } from 'lucide-react';
import { ProgressState } from '../types';

interface ProgressModalProps {
  progress: ProgressState;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({ progress }) => {
  if (!progress.isGenerating) return null;

  return (
    <div
      id="modal-pdf-progress"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-gray-100 text-center">
        {/* Animated Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 stroke-[2.25]" />
          <FileText className="w-4 h-4 absolute text-blue-500" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Creating Your PDF...
        </h3>

        <p className="text-xs text-gray-500 mb-5">
          Processing image {progress.currentStep} of {progress.totalSteps}
        </p>

        {/* Progress Bar Container */}
        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-2 p-0.5 border border-gray-200">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-200 ease-out shadow-xs"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Status detail */}
        <div className="flex items-center justify-between text-[11px] font-medium text-gray-400">
          <span className="truncate max-w-[200px] text-left">
            {progress.currentImageName ? progress.currentImageName : 'Preparing document...'}
          </span>
          <span className="font-mono text-blue-600 font-bold ml-2 shrink-0">
            {progress.percentage}%
          </span>
        </div>

        <p className="text-[11px] text-gray-400 mt-4 italic">
          High-speed local processing. Your images never leave this device.
        </p>
      </div>
    </div>
  );
};

