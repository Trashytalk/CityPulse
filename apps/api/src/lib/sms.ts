// apps/api/src/lib/sms.ts
import { env } from './env';

interface SMSProvider {
  send(to: string, message: string): Promise<void>;
}

// Console provider for development
class ConsoleSMSProvider implements SMSProvider {
  async send(to: string, message: string): Promise<void> {
    console.log('📱 SMS to', to);
    console.log('   Message:', message);
  }
}

// Twilio provider for production
class TwilioSMSProvider implements SMSProvider {
  private client: any;

  constructor() {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    // Lazy import Twilio
    const twilio = require('twilio');
    this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  async send(to: string, message: string): Promise<void> {
    await this.client.messages.create({
      to,
      from: env.TWILIO_PHONE_NUMBER,
      body: message,
    });
  }
}

// Factory function to get provider
function getProvider(): SMSProvider {
  switch (env.SMS_PROVIDER) {
    case 'twilio':
      return new TwilioSMSProvider();
    case 'console':
    default:
      return new ConsoleSMSProvider();
  }
}

// Singleton provider instance
let provider: SMSProvider | null = null;

function getSMSProvider(): SMSProvider {
  if (!provider) {
    provider = getProvider();
  }
  return provider;
}

/**
 * Send SMS message
 */
export async function sendSMS(to: string, message: string): Promise<void> {
  const smsProvider = getSMSProvider();
  await smsProvider.send(to, message);
}

/**
 * Send OTP via SMS
 */
export async function sendOTPSMS(phone: string, code: string): Promise<void> {
  const message = `Your CityPulse verification code is: ${code}. Valid for ${env.OTP_EXPIRY_MINUTES} minutes.`;
  await sendSMS(phone, message);
}

/**
 * Send withdrawal notification
 */
export async function sendWithdrawalSMS(
  phone: string,
  amount: number,
  method: string
): Promise<void> {
  const formattedAmount = (amount / 100).toFixed(2);
  const message = `CityPulse: ₱${formattedAmount} has been sent to your ${method}. Thank you for contributing!`;
  await sendSMS(phone, message);
}
