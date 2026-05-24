import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifica la firma HMAC-SHA256 que Izipay envía junto al resultado del pago.
 * Izipay firma el payload (kr-answer / payloadHttp) con la clave HMAC del comercio.
 * Aceptamos la firma en hex y en base64 para ser tolerantes a la variante del SDK
 * (Web-Core/Krypton suele devolver hex; otras integraciones base64).
 */
export function checkSignature(
  payload: string,
  keyHash: string,
  signature: string,
): boolean {
  if (!payload || !keyHash || !signature) return false;

  const key = Buffer.from(keyHash, 'utf8');
  const message = Buffer.from(payload, 'utf8');

  const expectedHex = createHmac('sha256', key).update(message).digest('hex');
  const expectedB64 = createHmac('sha256', key)
    .update(message)
    .digest('base64');

  return (
    safeCompare(signature, expectedHex) || safeCompare(signature, expectedB64)
  );
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
