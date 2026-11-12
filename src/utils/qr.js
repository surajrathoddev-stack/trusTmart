// src/utils/qr.js
// QR code generation for product units.

const QRCode = require('qrcode');

/**
 * Generate a QR code data-URI (PNG base64) encoding the unit lookup payload.
 * The payload contains the unitId and a verification URL.
 *
 * @param {string} unitId   The unique product unit ID.
 * @param {string} [baseUrl]  Optional base URL for the verification endpoint.
 * @returns {Promise<string>}  Data URI of the QR code image.
 */
async function generateQR(unitId, baseUrl = '') {
  const payload = JSON.stringify({
    unitId,
    verifyUrl: `${baseUrl}/api/verify/${unitId}`,
  });
  return QRCode.toDataURL(payload);
}

module.exports = { generateQR };

