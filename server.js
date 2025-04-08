const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); // Veritabanı bağlantısını import et
const authRoutes = require('./routes/auth'); // Auth rotalarını import et (henüz oluşturulmadı)
const categoryRoutes = require('./routes/categories'); // Kategori rotalarını import et (henüz oluşturulmadı)
const menuItemRoutes = require('./routes/menuItems'); // Menü öğesi rotalarını import et (henüz oluşturulmadı)
const publicRoutes = require('./routes/public'); // Public (müşteri) rotalarını import et (henüz oluşturulmadı)
const qrCodeRoutes = require('./routes/qrcode'); // QR Kod rotalarını import et (henüz oluşturulmadı)

// Express uygulama oluştur
const app = express();
const PORT = process.env.PORT || 5000; // Port numarasını belirle (varsayılan 5000)

// Middleware
app.use(cors({
  origin: '*', // Tüm domainlerden isteklere izin ver
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200 // OPTIONS istekleri için 200 dön
})); // Cross-Origin Resource Sharing'i etkinleştir
app.use(express.json()); // Gelen JSON isteklerini parse et
app.use(express.urlencoded({ extended: true })); // Form verilerini parse et

// app.js middleware'ini uygula
const setupMiddleware = require('./app.js');
setupMiddleware(app);

// Uploads dizinine erişim (doğrudan server.js'den de erişim sağlayalım)
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));
console.log('Server.js - Uploads dizini erişime açıldı:', uploadsPath);

// Static dosyaları servis et
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
console.log('Server.js - Public dizini erişime açıldı:', publicPath);

// Temel Rota - API çalıştığını kontrol etmek için
app.get('/api/check', (req, res) => {
    res.json({ status: 'success', message: 'QuickQR Menu Backend Çalışıyor!' });
});

// API Rotaları
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/qr', qrCodeRoutes);

// Tüm diğer istekler için index.html servis et (SPA için)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
});

// Veritabanı bağlantısını kapatma (uygulama kapanırken)
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Veritabanı bağlantısı kapatıldı.');
        process.exit(0);
    });
});