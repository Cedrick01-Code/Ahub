import whatsappWeb from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const { Client, LocalAuth } = whatsappWeb;

let client;
let state = 'disabled';
let testOtp;

export const startWhatsApp = () => {
  if (client) return client;
  if (process.env.WHATSAPP_ENABLED !== 'true') return null;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: process.env.WHATSAPP_SESSION_PATH || '.wwebjs_auth' }),
    userAgent: process.env.WHATSAPP_USER_AGENT || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    puppeteer: {
      headless: true,
      executablePath: process.env.WHATSAPP_CHROME_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });
  state = 'connecting';
  client.on('qr', (qr) => { state = 'pairing'; console.log('Scan this QR code with the AHub WhatsApp sender account:'); qrcode.generate(qr, { small: true }); });
  client.on('authenticated', () => { state = 'authenticated'; console.log('WhatsApp sender authenticated.'); });
  client.on('ready', () => { state = 'ready'; console.log('WhatsApp sender is ready.'); });
  client.on('loading_screen', (percent, message) => console.log(`WhatsApp Web loading ${percent}%: ${message}`));
  client.on('change_state', (nextState) => console.log('WhatsApp connection state:', nextState));
  client.on('error', (error) => console.error('WhatsApp client error:', error.message));
  client.on('auth_failure', (message) => { state = 'auth_failure'; console.error('WhatsApp authentication failed:', message); });
  client.on('disconnected', (reason) => { state = 'disconnected'; console.error('WhatsApp sender disconnected:', reason); });
  void client.initialize().catch(async (error) => {
    state = 'error';
    console.error('WhatsApp startup failed:', error.stack || error.message);
    try { await client?.destroy(); } catch { /* The browser may already be closed. */ }
    client = null;
  });
  return client;
};

export const whatsappStatus = () => ({ enabled: process.env.WHATSAPP_ENABLED === 'true', state });

export const sendWhatsAppOtp = async (phone, code, expiresInMinutes = 5) => {
  if (process.env.NODE_ENV === 'test') { testOtp = String(code); return; }
  if (!client || state !== 'ready') throw new Error('WhatsApp OTP delivery is unavailable; the sender account is not connected.');
  const digits = String(phone).replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(digits)) throw new Error('The account phone number must include its country code.');
  await client.sendMessage(`${digits}@c.us`, `Your AHub sign-in code is ${code}. It expires in ${expiresInMinutes} minutes. Do not share this code.`);
};

export const getLastTestOtp = () => process.env.NODE_ENV === 'test' ? testOtp : undefined;

export const stopWhatsApp = async () => { if (client) await client.destroy(); client = null; state = 'disabled'; };
