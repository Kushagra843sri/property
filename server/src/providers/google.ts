import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}
export type GoogleVerifier = (credential: string) => Promise<GoogleIdentity | null>;

let client: OAuth2Client | undefined;

/** Verifies signature, expiry, issuer and audience (our client ID) via Google's public keys. */
const real: GoogleVerifier = async (credential) => {
  const audience = env.GOOGLE_CLIENT_ID;
  if (!audience) return null;
  try {
    client ??= new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: credential, audience });
    const p = ticket.getPayload();
    if (!p?.sub || !p.email) return null;
    return {
      sub: p.sub,
      email: p.email,
      emailVerified: p.email_verified === true,
      name: p.name ?? '',
    };
  } catch (err) {
    // The caller still gets one generic outcome; the reason (never the token) goes to the log.
    logger.warn(
      { reason: err instanceof Error ? err.message : 'unknown' },
      'google token rejected',
    );
    return null;
  }
};

let verifier: GoogleVerifier = real;
export const verifyGoogle: GoogleVerifier = (credential) => verifier(credential);
/** Test seam, same pattern as the mail provider. */
export const setGoogleVerifier = (v: GoogleVerifier) => {
  verifier = v;
};
export const googleEnabled = () => !!env.GOOGLE_CLIENT_ID;
