import multer from 'multer';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGES_PER_PROPERTY,
  MAX_IMAGE_BYTES,
} from '../config/constants.js';
import { AppError } from '../utils/errors.js';

// Memory storage: files are processed (re-encoded, EXIF stripped) and pushed to the image store;
// nothing is ever written to or served from the app server's disk.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_PROPERTY, fields: 5, parts: 30 },
  fileFilter(_req, file, cb) {
    const ok = (ALLOWED_IMAGE_MIME as readonly string[]).includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(AppError.badRequest('Only JPG, PNG or WebP images are allowed'));
  },
}).array('images', MAX_IMAGES_PER_PROPERTY);
