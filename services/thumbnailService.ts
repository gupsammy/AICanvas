const THUMBNAIL_SIZE = 256;

export async function generateThumbnail(base64Src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');

      // Calculate dimensions maintaining aspect ratio
      let width = THUMBNAIL_SIZE;
      let height = THUMBNAIL_SIZE;
      if (img.naturalWidth > img.naturalHeight) {
        height = (img.naturalHeight / img.naturalWidth) * THUMBNAIL_SIZE;
      } else {
        width = (img.naturalWidth / img.naturalHeight) * THUMBNAIL_SIZE;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // JPEG at 70% quality for smaller size
    };
    img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
    img.src = base64Src;
  });
}
