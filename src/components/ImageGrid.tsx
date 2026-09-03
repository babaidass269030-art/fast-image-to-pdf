import React, { useRef, useState, useEffect } from 'react';
import { Plus, SlidersHorizontal, GripVertical, CheckCircle2 } from 'lucide-react';
import { SelectedImage, PdfSettings } from '../types';
import { ImageCard } from './ImageCard';
import { PdfSettingsCard } from './PdfSettingsCard';

interface ImageGridProps {
  images: SelectedImage[];
  totalSizeFormatted: string;
  settings: PdfSettings;
  onUpdateSettings: (settings: Partial<PdfSettings>) => void;
  onSelectMoreFiles: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onRotate: (id: string) => void;
  onReorder: (sourceIndex: number, targetIndex: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onClearAll: () => void;
  onOpenSettingsModal: () => void;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  totalSizeFormatted,
  settings,
  onUpdateSettings,
  onSelectMoreFiles,
  onRemove,
  onRotate,
  onReorder,
  onMoveUp,
  onMoveDown,
  onOpenSettingsModal,
}) => {
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null);

  const handleAddMoreClick = () => {
    if (addMoreInputRef.current) {
      addMoreInputRef.current.value = '';
      addMoreInputRef.current.click();
    }
  };

  const handleAddMoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectMoreFiles(e.target.files);
    }
    e.target.value = '';
  };

  // HTML5 Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dropTargetIndex === index) {
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    const sourceStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = draggedIndex !== null ? draggedIndex : parseInt(sourceStr, 10);

    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      onReorder(sourceIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  // Touch drag support for mobile Android screens
  const handleTouchStartHandle = (index: number) => {
    setTouchStartIndex(index);
    setDraggedIndex(index);
  };

  useEffect(() => {
    if (touchStartIndex === null) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const cardElem = elem?.closest('[data-card-index]') as HTMLElement | null;
      if (cardElem && cardElem.dataset.cardIndex !== undefined) {
        const idx = parseInt(cardElem.dataset.cardIndex, 10);
        if (!isNaN(idx) && idx !== dropTargetIndex) {
          setDropTargetIndex(idx);
        }
      }
    };

    const handleTouchEnd = () => {
      if (touchStartIndex !== null && dropTargetIndex !== null && touchStartIndex !== dropTargetIndex) {
        onReorder(touchStartIndex, dropTargetIndex);
      }
      setTouchStartIndex(null);
      setDraggedIndex(null);
      setDropTargetIndex(null);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [touchStartIndex, dropTargetIndex, onReorder]);

  return (
    <div className="space-y-4 pb-28">
      {/* Hidden File Input for Adding More */}
      <input
        ref={addMoreInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleAddMoreChange}
        className="hidden"
        id="add-more-file-input"
      />

      {/* Top Section Header: Count and Quick Controls */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">
              Selected Images ({images.length})
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 font-bold text-blue-700">
              {totalSizeFormatted}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-gray-400" />
            <span>Drag cards to reorder • PDF will follow this exact order</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-quick-options"
            type="button"
            onClick={onOpenSettingsModal}
            className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Additional PDF options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Options</span>
          </button>
          <button
            id="btn-quick-add-more"
            type="button"
            onClick={handleAddMoreClick}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add More</span>
          </button>
        </div>
      </div>

      {/* Responsive Grid of Images with Drag-and-Drop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, idx) => (
          <ImageCard
            key={img.id}
            image={img}
            index={idx}
            totalCount={images.length}
            isDragging={draggedIndex === idx}
            isDropTarget={dropTargetIndex === idx && draggedIndex !== idx}
            onRemove={onRemove}
            onRotate={onRotate}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onTouchStartHandle={handleTouchStartHandle}
          />
        ))}

        {/* Add More Thumbnail Tile */}
        <button
          id="btn-add-more-card"
          type="button"
          onClick={handleAddMoreClick}
          className="aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-gray-500 hover:text-blue-600 transition-all flex flex-col items-center justify-center p-3 group shadow-2xs cursor-pointer active:scale-95"
          title="Select more images from device gallery"
        >
          <div className="w-10 h-10 rounded-2xl bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors mb-2">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold text-gray-700 group-hover:text-blue-600">
            Add More
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">
            Photos
          </span>
        </button>
      </div>

      {/* Dedicated PDF Settings Section */}
      <PdfSettingsCard
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onOpenAdvancedModal={onOpenSettingsModal}
      />

      {/* Pre-conversion summary footer banner */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 leading-snug">
              {images.length} {images.length === 1 ? 'Page' : 'Pages'} Ready for PDF
            </p>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
              {settings.pageSize.toUpperCase()} • {settings.imageFit === 'fit' ? 'Fit to Page' : 'Fill Page'} • {settings.quality.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Ready
          </span>
        </div>
      </div>
    </div>
  );
};
