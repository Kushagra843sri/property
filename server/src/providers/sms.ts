import { env, isDev } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface Sms {
  to: string;
  body: string;
}
export interface SmsSender {
  send(sms: Sms): Promise<void>;
}

export const smsOutbox: Sms[] = [];

class ConsoleSms implements SmsSender {
  async send(sms: Sms) {
    smsOutbox.push(sms);
    if (smsOutbox.length > 100) smsOutbox.shift();
    if (isDev) logger.info({ to: sms.to, body: sms.body }, 'DEV SMS');
  }
}

class TwilioSms implements SmsSender {
  async send(sms: Sms) {
    const sid = env.TWILIO_ACCOUNT_SID as string;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: sms.to, From: env.TWILIO_FROM as string, Body: sms.body }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`sms provider responded ${res.status}`);
  }
}

let sender: SmsSender = env.SMS_PROVIDER === 'twilio' ? new TwilioSms() : new ConsoleSms();
export const getSms = () => sender;
export const setSms = (s: SmsSender) => {
  sender = s;
};
