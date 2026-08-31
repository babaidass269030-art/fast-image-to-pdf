import React from 'react';
import { RotateCw, ArrowLeft, ArrowRight, X, GripVertical } from 'lucide-react';
import { SelectedImage } from '../types';

interface ImageCardProps {
  image: SelectedImage;
  index: number;
  totalCount: number;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onRemove: (id: string) => void;
  onRotate: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onTouchStartHandle?: (index: number, e: React.TouchEvent) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  index,
  totalCount,
  isDragging = false,
  isDropTarget = false,
  onRemove,
  onRotate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  onTouchStartHandle,
}) => {
  return (
    <div
      id={`image-card-${image.id}`}
      data-card-index={index}
      draggable={true}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragLeave={(e) => onDragLeave(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`group relative bg-white rounded-2xl border transition-all duration-150 overflow-hidden flex flex-col select-none ${
        isDragging
          ? 'opacity-40 scale-95 border-blue-400 ring-2 ring-blue-400 ring-dashed shadow-inner'
          : isDropTarget
          ? 'border-blue-500 ring-2 ring-blue-500 scale-[1.03] shadow-md z-20 bg-blue-50/20'
          : 'border-gray-200 shadow-xs hover:shadow-md hover:border-gray-300'
      }`}
    >
      {/* Top Bar: Order Badge with Grip Handle + Remove Button */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
        {/* Page Order & Drag Handle Badge */}
        <div
          onTouchStart={(e) => onTouchStartHandle && onTouchStartHandle(index, e)}
          className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900/85 hover:bg-gray-900 text-white text-[11px] font-bold backdrop-blur-xs shadow-xs cursor-grab active:cursor-grabbing transition-transform active:scale-95"
          title="Drag to change page order"
        >
          <GripVertical className="w-3.5 h-3.5 text-gray-300 stroke-[2.5]" />
          <span>Page {index + 1}</span>
        </div>

        {/* Remove (X) Button */}
        <button
          id={`btn-remove-${image.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(image.id);
          }}
          aria-label={`Remove image ${index + 1}`}
          className="pointer-events-auto w-7 h-7 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all transform hover:scale-110 active:scale-90"
          title="Remove this image"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Image Thumbnail Preview Area */}
      <div
        className="relative w-full aspect-[3/4] bg-slate-50 flex items-center justify-center overflow-hidden p-2.5 cursor-grab active:cursor-grabbing"
        title="Drag image to reorder"
      >
        <img
          src={image.previewUrl}
          alt={image.name}
          className="max-h-full max-w-full object-contain rounded-xl shadow-2xs transition-transform duration-200 pointer-events-none"
          style={{ transform: `rotate(${image.rotation}deg)` }}
          loading="lazy"
        />

        {/* Rotation indicator pill */}
        {image.rotation !== 0 && (
          <span className="absolute bottom-2 left-2 bg-gray-900/75 text-white text-[9px] px-1.5 py-0.5 rounded-md font-mono backdrop-blur-xs">
            {image.rotation}°
          </span>
        )}

        {/* Visual drop indicator overlay */}
        {isDropTarget && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 rounded-2xl flex items-center justify-center pointer-events-none">
            <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              Drop to Page {index + 1}
            </span>
          </div>
        )}
      </div>

      {/* Card Footer: Metadata and Quick Controls */}
      <div className="p-2.5 bg-white border-t border-gray-100 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-xs font-semibold text-gray-800 truncate" title={image.name}>
            {image.name}
          </p>
          <span className="text-[10px] font-mono text-gray-400 shrink-0">
            {image.sizeFormatted}
          </span>
        </div>

        {/* Reorder and Rotation buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div className="flex items-center gap-1">
            <button
              id={`btn-move-up-${image.id}`}
              type="button"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(index);
              }}
              aria-label="Move page earlier"
              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title="Move page earlier"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.25]" />
            </button>
            <button
              id={`btn-move-down-${image.id}`}
              type="button"
              disabled={index === totalCount - 1}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(index);
              }}
              aria-label="Move page later"
              className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title="Move page later"
            >
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.25]" />
            </button>
          </div>

          <button
            id={`btn-rotate-${image.id}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(image.id);
            }}
            aria-label="Rotate image clockwise"
            className="p-1 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-1 text-[10px] font-semibold"
            title="Rotate 90° clockwise"
          >
            <RotateCw className="w-3 h-3 stroke-[2.25]" />
            <span>Rotate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
