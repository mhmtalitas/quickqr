const db = require('./database');

// Kategoriler tablosuna image_path kolonu eklemek için
console.log('Kategoriler tablosuna image_path kolonu ekleniyor...');

db.serialize(() => {
    // image_path kolonunu ekle
    db.run(`ALTER TABLE categories ADD COLUMN image_path TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('image_path kolonu zaten mevcut.');
            } else {
                console.error('Kolonu eklerken hata:', err.message);
            }
        } else {
            console.log('image_path kolonu başarıyla eklendi.');
        }
        
        // uploads klasörünü oluştur
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(__dirname, 'uploads/categories');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('Uploads dizini oluşturuldu:', uploadDir);
        } else {
            console.log('Uploads dizini zaten mevcut:', uploadDir);
        }
        
        // İşlem tamamlandı
        console.log('Kategori tablosu güncellemesi tamamlandı.');
    });
}); 