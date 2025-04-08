const express = require('express');
const path = require('path');

// app.js Express middleware fonksiyonlarını içerir
// server.js tarafından import edilir

// Görsel dosyalarının erişim izni için
module.exports = function(app) {
    // CORS izinlerini genişlet
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        // OPTIONS isteklerine hemen yanıt ver
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        
        next();
    });
    
    // Tüm uploads klasörlerini ve alt klasörlerini erişime aç
    const uploadsDir = path.join(__dirname, 'uploads');
    app.use('/uploads', express.static(uploadsDir));
    console.log('Uploads dizini erişime açıldı:', uploadsDir);
    
    const categoriesDir = path.join(uploadsDir, 'categories');
    app.use('/uploads/categories', express.static(categoriesDir));
    console.log('Categories dizini erişime açıldı:', categoriesDir);
    
    // Menu items klasörü
    const menuItemsDir = path.join(uploadsDir, 'menu-items');
    app.use('/uploads/menu-items', express.static(menuItemsDir));
    console.log('Menu items dizini erişime açıldı:', menuItemsDir);
}; 