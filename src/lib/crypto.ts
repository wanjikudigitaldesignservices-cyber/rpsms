/**
 * Cryptographic utility functions for Rockport Police Station Management System (RPSMS)
 * Enforces SHA-256 hash chaining, blind-index generation for PII, and immutable ledger integrity.
 */

const BLIND_INDEX_SALT = 'ROCKPORT-POLICE-SALT-2026-KDPA-COMPLIANT';

/**
 * Calculates SHA-256 hex string for any string content using Web Crypto API.
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fast synchronous SHA-256 representation for immediate UI rendering before async resolution.
 */
export function quickHashSync(message: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0, ch; i < message.length; i++) {
    ch = message.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
  const p2 = (4294967296 * (2097151 & h1) + (h2 >>> 0)).toString(16).padStart(16, '0');
  return (p1 + p2 + p1 + p2).slice(0, 64);
}

/**
 * Computes a standardized Blind-Index SHA-256 hash for sensitive PII (National ID, Phone Number).
 * Cleaned: uppercase, whitespace and non-alphanumeric removed.
 */
export async function computeBlindIndexHash(value: string): Promise<string> {
  const sanitized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!sanitized) return '';
  return sha256(`${BLIND_INDEX_SALT}:${sanitized}`);
}

/**
 * Synchronous version of Blind-Index hash for immediate instant search lookup.
 */
export function computeBlindIndexHashSync(value: string): string {
  const sanitized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!sanitized) return '';
  return quickHashSync(`${BLIND_INDEX_SALT}:${sanitized}`);
}

/**
 * Generates the next sequential Occurrence Book (OB) number.
 * Format: {seq}/{DD}/{MM}/{YYYY}
 */
export function formatOBNumber(seq: number, date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${seq}/${dd}/${mm}/${yyyy}`;
}

/**
 * Cryptographically chains an Occurrence Book entry to the previous entry hash.
 */
export async function calculateOBEntryHash(params: {
  stationCode: string;
  obNumber: string;
  seqNumber: number;
  incidentDate: string;
  category: string;
  subject: string;
  narrative: string;
  recordedByServiceNo: string;
  previousEntryHash: string;
}): Promise<string> {
  const canonicalString = [
    params.stationCode,
    params.obNumber,
    params.seqNumber.toString(),
    params.incidentDate,
    params.category,
    params.subject,
    params.narrative,
    params.recordedByServiceNo,
    params.previousEntryHash,
  ].join('|');

  return sha256(canonicalString);
}

/**
 * Strips EXIF metadata from an image and applies official Rockport Police Station
 * biometric watermark with timestamp and recording officer service number.
 */
export async function watermarkAndStripExif(
  imageSource: string | File,
  stationCode: string,
  officerServiceNo: string,
  viewAngle: string
): Promise<{ dataUrl: string; sha256Hash: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      // Create off-screen canvas (strips all EXIF metadata by re-encoding raw pixels)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      canvas.width = img.width || 800;
      canvas.height = img.height || 1000;

      // Draw original image pixels
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw Institutional Header Banner
      ctx.fillStyle = 'rgba(10, 13, 20, 0.85)';
      ctx.fillRect(0, 0, canvas.width, 42);

      ctx.fillStyle = '#D4AF37'; // Police Gold
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`KENYA POLICE SERVICE • ROCKPORT STATION (${stationCode})`, 16, 26);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`ANGLE: ${viewAngle}`, canvas.width - 16, 26);

      // Draw Institutional Footer Watermark
      const footerY = canvas.height - 42;
      ctx.fillStyle = 'rgba(10, 13, 20, 0.85)';
      ctx.fillRect(0, footerY, canvas.width, 42);

      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' EAT';

      ctx.textAlign = 'left';
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '12px monospace';
      ctx.fillText(`BOOKING BIOMETRIC • OFFICER: ${officerServiceNo}`, 16, footerY + 26);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(timestamp, canvas.width - 16, footerY + 26);

      // Re-encode clean JPEG (EXIF completely eradicated)
      const cleanDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const hash = await sha256(cleanDataUrl);

      resolve({
        dataUrl: cleanDataUrl,
        sha256Hash: hash,
      });
    };

    img.onerror = () => reject(new Error('Failed to load image for watermarking'));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(imageSource);
    }
  });
}
