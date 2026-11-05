import { env, isDev } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}
export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Captured messages, available outside production so tests can read OTPs. Never logged except in dev. */
export const outbox: Mail[] = [];

class ConsoleMailer implements Mailer {
  async send(mail: Mail) {
    outbox.push(mail);
    if (outbox.length > 100) outbox.shift();
    // Dev only: lets a developer read the OTP without a real provider.
    if (isDev) logger.info({ to: mail.to, subject: mail.subject, text: mail.text }, 'DEV MAIL');
  }
}

class ResendMailer implements Mailer {
  async send(mail: Mail) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`mail provider responded ${res.status}`);
  }
}

let mailer: Mailer = env.MAIL_PROVIDER === 'resend' ? new ResendMailer() : new ConsoleMailer();
export const getMailer = () => mailer;
/** Test hook. */
export const setMailer = (m: Mailer) => {
  mailer = m;
};
