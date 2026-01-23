"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  isDragging: boolean;
  hasFiles: boolean;
  onDragChange: (dragging: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileDropZone({
  isDragging,
  hasFiles,
  onDragChange,
  onDrop,
  onFileInput,
}: FileDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragChange(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      e.currentTarget &&
      e.relatedTarget &&
      !(e.currentTarget as Node).contains(e.relatedTarget as Node)
    ) {
      onDragChange(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragChange(true);
  };

  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragChange(false);
    onDrop(e);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDropInternal}
      onClick={handleClick}
      className={cn(
        "relative rounded-[2.5rem] border-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden cursor-pointer group",
        isDragging
          ? "border-neutral-900 bg-neutral-100 scale-[1.01] shadow-2xl"
          : "border-dashed border-neutral-200 bg-white/60 hover:bg-white/80 hover:border-neutral-300 shadow-sm hover:shadow-md",
        hasFiles ? "flex-[0_0_auto] h-48 mb-6" : "h-full min-h-[300px]"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFileInput}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
        <div
          className={cn(
            "rounded-full bg-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
            isDragging ? "scale-125 rotate-0" : "",
            hasFiles ? "mb-3 p-4" : "mb-6 p-6"
          )}
        >
          <Upload
            className={cn(
              "text-neutral-900 transition-colors",
              isDragging
                ? "text-neutral-900"
                : "text-neutral-400 group-hover:text-neutral-900",
              hasFiles ? "h-6 w-6" : "h-10 w-10"
            )}
          />
        </div>
        <h3
          className={cn(
            "font-semibold text-neutral-900 tracking-tight transition-all duration-300",
            hasFiles ? "text-lg mb-1" : "text-2xl mb-2"
          )}
        >
          {isDragging ? "放下文件" : "拖放文件到这里"}
        </h3>
        {!hasFiles && (
          <p className="text-sm text-neutral-500 max-w-sm">
            或点击选择文件进行传输
          </p>
        )}
      </div>
    </div>
  );
}
