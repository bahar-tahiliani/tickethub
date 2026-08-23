const QRCode = require('qrcode');

async function generateQrCodeDataUrl(bookingReference) {
  const verificationUrl =
    `http://localhost:5173/verify/${bookingReference}`;

  return QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300
  });
}

module.exports = { generateQrCodeDataUrl };
