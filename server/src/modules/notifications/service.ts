import { env } from '../../config/env.js';
import { getMailer } from '../../providers/mailer.js';
import { logger } from '../../utils/logger.js';

const clientUrl = () => env.CLIENT_URL ?? env.CORS_ORIGINS[0] ?? '';
export const listingUrl = (slug: string) => `${clientUrl()}/listings/${slug}`;

/** wa.me wants the number as digits only (E.164 without the +). */
export const whatsappUrl = (e164: string) => `https://wa.me/${e164.replace(/\D/g, '')}`;

/** Sends one email. Returns true if delivered; never throws (alerts must not break requests). */
async function sendQuietly(to: string, subject: string, text: string): Promise<boolean> {
  try {
    await getMailer().send({ to, subject, text });
    return true;
  } catch (err) {
    logger.error({ err }, 'notification failed');
    return false;
  }
}

/** Send an alert to the dealer. */
export async function notifyDealer(subject: string, text: string): Promise<boolean> {
  const to = env.DEALER_NOTIFY_EMAIL;
  if (!to) {
    logger.warn('DEALER_NOTIFY_EMAIL not set; dealer notification skipped');
    return false;
  }
  return sendQuietly(to, subject, text);
}

/** Send a confirmation to a user (their own address, from their own action). */
export const notifyUser = sendQuietly;
