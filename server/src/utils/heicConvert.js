import fs from 'fs';
import path from 'path';

/**
 * BUG FIX (newsletter broken image icon — Aug 5, 2026):
 * Root cause: photos shared directly from an iPhone Gallery are HEIC/HEIF by
 * default. The newsletter uploader accepted them (accept="image/*,.heic,.heif")
 * and stored them as-is, and the composer preview rendered fine because modern
 * browsers can decode HEIC. But almost no email client can render a raw HEIC
 * <img> tag, so recipients saw a broken-image placeholder instead of the photo.
 *
 * Fix: if the uploaded file is HEIC/HEIF, convert it to a JPEG on disk right
 * after upload and return the JPEG's filename instead. Every other image type
 * passes through untouched.
 */
export async function convertHeicIfNeeded(uploadedPath, destDir) {
  const ext = path.extname(uploadedPath).toLowerCase();
  const original = path.basename(uploadedPath);

  if (ext !== '.heic' && ext !== '.heif') {
    return original;
  }

  try {
    const convert = (await import('heic-convert')).default;
    const inputBuffer = fs.readFileSync(uploadedPath);
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.9,
    });

    const jpegName = original.replace(/\.(heic|heif)$/i, '.jpg');
    const jpegPath = path.join(destDir, jpegName);
    fs.writeFileSync(jpegPath, outputBuffer);

    // Remove the original HEIC so it doesn't linger unused on disk.
    fs.unlinkSync(uploadedPath);

    console.log(`[NEWSLETTER] Converted HEIC upload -> ${jpegName}`);
    return jpegName;
  } catch (err) {
    // If conversion fails for any reason, fall back to the original file
    // rather than breaking the upload entirely — but log loudly, since this
    // means the email will still ship with a HEIC image.
    console.error('[NEWSLETTER] HEIC conversion failed, using original file:', err.message);
    return original;
  }
}
