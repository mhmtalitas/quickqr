const express = require('express');
const qrcode = require('qrcode');
const { authenticateToken } = require('./auth'); // Token doğrulama

const router = express.Router();

// --- QR Kod Oluştur (Admin Gerekli) ---
// Bu endpoint, frontend'deki public menü URL'sini içeren bir QR kod oluşturur.
// Frontend URL'si şimdilik sabit kodlanmıştır, idealde yapılandırılabilir olmalıdır.
router.get('/generate', authenticateToken, async (req, res) => {
    // Frontend'in public menü URL'si (React varsayılan portu 3000)
    // Gerçek uygulamada bu URL'yi ortam değişkeninden veya veritabanından almak daha iyi olur.
    const frontendMenuUrl = process.env.FRONTEND_URL || 'http://localhost:3000/menu'; // Veya hangi portta çalışacaksa

    try {
        // QR kodu Data URL olarak oluştur
        const qrCodeDataUrl = await qrcode.toDataURL(frontendMenuUrl, {
            errorCorrectionLevel: 'H', // Yüksek hata düzeltme seviyesi
            type: 'image/png',
            margin: 2, // Kenar boşluğu
            color: {
              dark:"#000000",  // Siyah noktalar
              light:"#FFFFFF" // Beyaz arka plan
           }
        });

        res.json({
            message: 'QR Kod başarıyla oluşturuldu.',
            qrCodeUrl: frontendMenuUrl, // Hangi URL için oluşturulduğu
            qrCodeDataUrl: qrCodeDataUrl // QR Kodun kendisi (Data URL formatında)
        });

    } catch (err) {
        console.error('QR Kod oluşturma hatası:', err);
        res.status(500).json({ message: 'QR Kod oluşturulurken bir hata oluştu.' });
    }
});

module.exports = router;