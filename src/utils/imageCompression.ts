import imageCompression from 'browser-image-compression';

export interface CompressedImageResult {
  dataUrl: string;
  sizeKB: number;
  width: number;
  height: number;
}

/**
 * Comprime cualquier imagen subida en cliente a formato WebP con ancho máximo 1080px y peso < 120KB
 */
export async function compressImageToWebP(file: File): Promise<CompressedImageResult> {
  try {
    const options = {
      maxSizeMB: 0.11, // < 120 KB
      maxWidthOrHeight: 1080,
      useWebWorker: false,
      fileType: 'image/webp',
      initialQuality: 0.82,
    };

    const compressedFile = await Promise.race([
      imageCompression(file, options),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Image compression timeout')), 3000)
      ),
    ]);
    const dataUrl = await imageCompression.getDataUrlFromFile(compressedFile);

    // Obtener dimensiones
    const dims = await getImageDimensions(dataUrl);
    return {
      dataUrl,
      sizeKB: Math.round((compressedFile.size / 1024) * 10) / 10,
      width: dims.width,
      height: dims.height,
    };
  } catch {
    // Fallback por Canvas directo a WebP/JPEG < 120KB
    return fallbackCanvasWebP(file);
  }
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 800, height: 800 });
    img.src = src;
  });
}

function fallbackCanvasWebP(file: File): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1080;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar Canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/webp', 0.78);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        }
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        resolve({
          dataUrl,
          sizeKB: Math.round((approxBytes / 1024) * 10) / 10,
          width,
          height,
        });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
