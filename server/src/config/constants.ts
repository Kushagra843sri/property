export const API_PREFIX = '/api/v1';
export const BODY_LIMIT = '100kb';
export const MAX_PAGE_LIMIT = 50;
export const DEFAULT_PAGE_LIMIT = 12;

export const ACCESS_TOKEN_TTL_SEC = 15 * 60;
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export const CONSENT_VERSION = '2025-01';

export const MAX_IMAGES_PER_PROPERTY = 20;
/** Only Bunny Stream player links may be embedded on a listing (stops arbitrary iframes). */
export const VIDEO_URL_PATTERN =
  /^https:\/\/(?:iframe|player)\.mediadelivery\.net\/(?:embed|play)\/\d+\/[0-9a-f-]{36}(?:\?[\w=&.%-]*)?$/;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const COOKIE_ACCESS = 'access_token';
export const COOKIE_REFRESH = 'refresh_token';
export const COOKIE_CSRF = 'csrf_token';
export const HEADER_CSRF = 'x-csrf-token';

export const ADMIN_PASSWORD_MIN = 12;
export const USER_PASSWORD_MIN = 8; // SECURITY.md floor for end users
