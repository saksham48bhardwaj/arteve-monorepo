'use client';

import * as React from 'react';
import { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from './Button';

// --------------------------------------------------------------
// <AvatarCropper /> — modal that crops a chosen image to a square
// and returns a Blob ready for upload.
//
// Usage:
//   <AvatarCropper
//     file={pendingFile}
//     onCancel={() => setPendingFile(null)}
//     onCropped={async (blob) => { await uploadAvatar(blob); }}
//   />
// --------------------------------------------------------------

export interface AvatarCropperProps {
  /** The user-selected File to crop. Required when open. */
  file: File | null;
  /** Output size in pixels (square). Default 512. */
  size?: number;
  /** Image MIME type for the produced Blob. Default "image/jpeg". */
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Quality 0..1 (jpeg/webp only). Default 0.92. */
  quality?: number;
  onCancel: () => void;
  /** Called with the cropped Blob — async; the modal stays open until it resolves. */
  onCropped: (blob: Blob) => Promise<void> | void;
}

export function AvatarCropper({
  file,
  size = 512,
  outputType = 'image/jpeg',
  quality = 0.92,
  onCancel,
  onCropped,
}: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Convert File -> object URL once
  const imageSrc = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => {
    return () => { if (imageSrc) URL.revokeObjectURL(imageSrc); };
  }, [imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!imageSrc || !croppedPixels) return;
    try {
      setBusy(true);
      const blob = await cropToBlob(imageSrc, croppedPixels, size, outputType, quality);
      await onCropped(blob);
    } finally {
      setBusy(false);
    }
  }

  if (!file || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop avatar"
    >
      <div className="w-full max-w-md bg-surface rounded-2xl overflow-hidden shadow-xl flex flex-col">
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold text-ink-strong">Crop your photo</h2>
          <p className="text-sm text-ink-subtle mt-0.5">
            Drag to position, pinch or use the slider to zoom.
          </p>
        </div>

        <div className="relative h-72 w-full bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="px-5 py-3 border-t border-line">
          <label className="flex items-center gap-3">
            <span className="text-xs font-medium text-ink-muted w-10">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-brand"
            />
          </label>
        </div>

        <div className="px-5 py-3 border-t border-line flex justify-end gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={busy || !croppedPixels}>
            {busy ? 'Uploading…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------
// cropToBlob — runs the crop on a 2D canvas at the target size.
// --------------------------------------------------------------

function cropToBlob(
  imageSrc: string,
  pixels: Area,
  outSize: number,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(
        img,
        pixels.x, pixels.y, pixels.width, pixels.height,
        0, 0, outSize, outSize,
      );
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Crop produced no blob'))),
        type,
        quality,
      );
    };
    img.src = imageSrc;
  });
}
