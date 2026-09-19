/**
 * Compresses and resizes an image using the HTML5 Canvas API.
 * Ensures the longest side is no greater than maxDimension (default: 1600px)
 * and exports as a JPEG with the specified quality (default: 0.8 = 80%).
 * 
 * Works completely in-browser with zero external dependencies.
 */
export async function compressImage(
  source: File | string,
  maxDimension = 1600,
  quality = 0.8
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Only downscale if the longest side exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback: If 2D context fails, resolve original source if string
        if (typeof source === 'string') {
          resolve({ dataUrl: source, width: img.width, height: img.height });
          return;
        }
        reject(new Error('HTML Canvas 2D context not available'));
        return;
      }

      // Draw onto canvas with high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as JPEG with 80% compression quality
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ dataUrl, width, height });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image into browser memory'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('FileReader returned empty result'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(source);
    }
  });
}
