import React from 'react';
import { Loader2, FileText, AlertCircle, RefreshCw, X } from 'lucide-react';
import { ProgressState } from '../types';

interface ProgressModalProps {
  progress: ProgressState;
  onDismissError?: () => void;
  onRetryWithStandard?: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({
  progress,
  onDismissError,
  onRetryWithStandard,
}) => {
  // If not generating and no error, don't show
  if (!progress.isGenerating && !progress.errorMessage) return null;

  // Render Graceful Error Screen if an issue occurred during conversion
  if (progress.errorMessage) {
    return (
      <div
        id="modal-pdf-error"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      >
        <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-100 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Conversion Notice
          </h3>

          <p className="text-xs text-slate-600 mb-5 leading-relaxed px-2">
            The device needed more memory for this conversion. Switching to Standard Quality usually resolves this instantly.
          </p>

          <div className="space-y-2.5">
            {onRetryWithStandard && (
              <button
                type="button"
                onClick={onRetryWithStandard}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer text-sm shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry (Standard Quality)</span>
              </button>
            )}

            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer text-sm"
              >
                <X className="w-4 h-4" />
                <span>Dismiss</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Progress State
  return (
    <div
      id="modal-pdf-progress"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-100 text-center">
        {/* Animated Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 stroke-[2.25]" />
          <FileText className="w-4 h-4 absolute text-blue-500" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Creating Your PDF...
        </h3>

        <p className="text-xs text-slate-500 mb-5">
          Processing image {progress.currentStep} of {progress.totalSteps}
        </p>

        {/* Progress Bar Container */}
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2 p-0.5 border border-slate-200">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-200 ease-out shadow-xs"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Status detail */}
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span className="truncate max-w-[200px] text-left">
            {progress.currentImageName ? progress.currentImageName : 'Preparing document...'}
          </span>
          <span className="font-mono text-blue-600 font-bold ml-2 shrink-0">
            {progress.percentage}%
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mt-4 italic">
          High-speed local processing. Your images never leave this device.
        </p>
      </div>
    </div>
  );
};
