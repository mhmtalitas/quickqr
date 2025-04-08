const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database'); // Veritabanı bağlantısı

const router = express.Router();

// JWT için gizli anahtar (Gerçek uygulamada environment variable kullanın!)
const JWT_SECRET = 'your_very_secret_key_change_this'; // MUTLAKA DEĞİŞTİRİN!

// --- Admin Login ---
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    // Kullanıcıyı ve ilişkili işletme bilgilerini çek
    const sql = `
        SELECT u.id, u.username, u.password, u.role, u.business_id, b.slug as business_slug
        FROM users u
        JOIN businesses b ON u.business_id = b.id
        WHERE u.username = ?
    `;
    db.get(sql, [username], (err, user) => {
        if (err) {
            console.error('Login veritabanı hatası:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
        }

        // Şifreleri karşılaştır
        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error('Şifre karşılaştırma hatası:', err.message);
                return res.status(500).json({ message: 'Sunucu hatası.' });
            }
            if (!result) {
                return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
            }

            // Şifre doğruysa JWT oluştur
            // Şifre doğruysa JWT oluştur (işletme bilgilerini de ekle)
            const payload = {
                id: user.id,
                username: user.username,
                business_id: user.business_id,
                business_slug: user.business_slug,
                role: user.role // Rolü de ekleyebiliriz, yetkilendirme için faydalı olabilir
            };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' }); // Token süresini 8 saate çıkaralım

            res.json({ message: 'Giriş başarılı.', token });
        });
    });
});

// --- Token Doğrulama Middleware ---
// Bu middleware, korumalı rotalardan önce kullanılacak
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN_STRING

    if (token == null) {
        return res.sendStatus(401); // Token yoksa yetkisiz
    }

    jwt.verify(token, JWT_SECRET, (err, decodedPayload) => { // payload'ı 'decodedPayload' olarak adlandıralım
        if (err) {
            console.error('JWT doğrulama hatası:', err);
            return res.sendStatus(403); // Token geçersiz veya süresi dolmuşsa yasak
        }
        // Doğrulanmış kullanıcı ve işletme bilgisini request'e ekle
        req.user = {
            id: decodedPayload.id,
            username: decodedPayload.username,
            business_id: decodedPayload.business_id,
            business_slug: decodedPayload.business_slug,
            role: decodedPayload.role
        };
        next(); // Sonraki middleware veya rota işleyicisine geç
    });
};


module.exports = router;
// authenticateToken fonksiyonunu da export ediyoruz ki diğer route dosyalarında kullanabilelim
module.exports.authenticateToken = authenticateToken;