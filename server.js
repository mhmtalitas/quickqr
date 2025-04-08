const express = require('express');
const cors = require('cors');
const path = require('path');

// Vercel ortamında çalışıp çalışmadığımızı kontrol edelim
const isVercel = process.env.VERCEL === '1';

// Veritabanını sadece Vercel ortamında değilse yükleyelim
let db = null;
if (!isVercel) {
  db = require('./database'); // Veritabanı bağlantısını import et
}

const authRoutes = require('./routes/auth'); // Auth rotalarını import et
const categoryRoutes = require('./routes/categories'); // Kategori rotalarını import et
const menuItemRoutes = require('./routes/menuItems'); // Menü öğesi rotalarını import et
const publicRoutes = require('./routes/public'); // Public (müşteri) rotalarını import et
const qrCodeRoutes = require('./routes/qrcode'); // QR Kod rotalarını import et

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

// Vercel'de özel mesaj
app.get('/api/status', (req, res) => {
    if (isVercel) {
        res.json({ 
            status: 'success', 
            environment: 'vercel',
            message: 'Vercel ortamında çalışıyor! Database bağlantısı engellendi.'
        });
    } else {
        res.json({ 
            status: 'success', 
            environment: 'local',
            message: 'Yerel ortamda çalışıyor, database bağlantısı aktif.'
        });
    }
});

// API Rotaları - Vercel ortamında mock yanıtlar dönelim
if (isVercel) {
    app.use('/api/auth', (req, res) => res.json({ message: "Auth API Vercel'de mock mod" }));
    app.use('/api/categories', (req, res) => res.json({ message: "Categories API Vercel'de mock mod" }));
    app.use('/api/menu-items', (req, res) => res.json({ message: "Menu Items API Vercel'de mock mod" }));
    app.use('/api/public', (req, res) => res.json({ message: "Public API Vercel'de mock mod" }));
    app.use('/api/qr', (req, res) => res.json({ message: "QR API Vercel'de mock mod" }));
} else {
    app.use('/api/auth', authRoutes);
    app.use('/api/categories', categoryRoutes);
    app.use('/api/menu-items', menuItemRoutes);
    app.use('/api/public', publicRoutes);
    app.use('/api/qr', qrCodeRoutes);
}

// Tüm diğer istekler için index.html servis et (SPA için)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel için export
module.exports = app;