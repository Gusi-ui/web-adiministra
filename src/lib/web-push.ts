/**
 * Server-side Web Push helper.
 * Only import from API routes (Node.js runtime) — never from client code.
 * Initialises the web-push library with VAPID credentials from env vars.
 * If the required env vars are missing the module loads without error;
 * callers should check `vapidConfigured` before sending.
 */
import webPush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL ?? 'admin@localhost';

export const vapidConfigured = Boolean(publicKey && privateKey);

if (
  publicKey !== undefined &&
  publicKey !== '' &&
  privateKey !== undefined &&
  privateKey !== ''
) {
  webPush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
}

export { webPush };
