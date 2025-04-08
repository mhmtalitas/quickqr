const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Dosya sistemi işlemleri için

const router = express.Router();

// --- Multer Ayarları (Resim Yükleme için) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // İşletmeye özel klasör oluştur (opsiyonel ama daha düzenli)
        // const businessSlug = req.user?.business_slug || 'default'; // Token yoksa veya slug yoksa default
        // const uploadPath = path.join(__dirname, '../uploads/', businessSlug);
        // Şimdilik tek klasörde tutalım, gerekirse sonra ayırırız.
        const uploadPath = path.join(__dirname, '../uploads/');
        // uploads klasörü yoksa oluştur
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath); // Resimlerin kaydedileceği klasör
    },
    filename: function (req, file, cb) {
        // Dosya adını benzersiz yap (timestamp + orijinal ad)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Dosya tipi filtresi (sadece resimlere izin ver)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// --- İşletmeye Ait Menü Öğelerini Getir (Admin Gerekli) ---
// Kategori bilgisiyle birlikte join yaparak getir
router.get('/', authenticateToken, (req, res) => {
    const businessId = req.user.business_id;
    const sql = `
        SELECT mi.*, c.name as category_name
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE mi.business_id = ? AND c.business_id = ? -- Hem menü öğesi hem kategori işletmeye ait olmalı
        ORDER BY c.name, mi.name
    `;
    db.all(sql, [businessId, businessId], (err, rows) => {
        if (err) {
            console.error('Menü öğesi listeleme hatası:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        // image_url'i tam URL'ye çevir
        const itemsWithFullImageUrl = rows.map(item => ({
            ...item,
            image_url: item.image_url ? `${req.protocol}://${req.get('host')}/uploads/${item.image_url}` : null
        }));
        res.json(itemsWithFullImageUrl);
    });
});

// --- İşletmeye Ait Tek Menü Öğesini Getir (Admin Gerekli) ---
router.get('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const businessId = req.user.business_id;
    const sql = `
        SELECT mi.*, c.name as category_name
        FROM menu_items mi
        JOIN categories c ON mi.category_id = c.id
        WHERE mi.id = ? AND mi.business_id = ? AND c.business_id = ?
    `;
    db.get(sql, [id, businessId, businessId], (err, row) => {
        if (err) {
            console.error('Tek menü öğesi getirme hatası:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        if (!row) {
            return res.status(404).json({ message: 'Menü öğesi bulunamadı veya bu işletmeye ait değil.' });
        }
         // image_url'i tam URL'ye çevir
        const itemWithFullImageUrl = {
            ...row,
            image_url: row.image_url ? `${req.protocol}://${req.get('host')}/uploads/${row.image_url}` : null
        };
        res.json(itemWithFullImageUrl);
    });
});


// --- Yeni Menü Öğesi Ekle (Admin Gerekli) ---
// 'image' alanı dosya yükleme için kullanılacak
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
    const { category_id, name, description, price, status } = req.body;
    const image_url = req.file ? req.file.filename : null;
    const businessId = req.user.business_id;

    if (!category_id || !name || price === undefined) {
        // Eğer resim yüklendiyse ama diğer alanlar eksikse, yüklenen resmi sil
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: 'Kategori ID, isim ve fiyat gereklidir.' });
    }

    // Önce kategorinin bu işletmeye ait olup olmadığını kontrol et
    db.get('SELECT id FROM categories WHERE id = ? AND business_id = ?', [category_id, businessId], (catErr, category) => {
        if (catErr) {
            console.error("Kategori kontrol hatası:", catErr.message);
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: "Sunucu hatası." });
        }
        if (!category) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Geçersiz veya bu işletmeye ait olmayan kategori ID." });
        }

        // Kategori geçerliyse ekleme işlemine devam et
        const sql = `INSERT INTO menu_items (category_id, name, description, price, status, image_url, business_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const params = [category_id, name, description || null, price, status || 'available', image_url, businessId];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Menü öğesi ekleme hatası:', err.message);
             // Eğer hata oluşursa ve resim yüklendiyse, yüklenen resmi sil
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        res.status(201).json({
            message: 'Menü öğesi başarıyla eklendi.',
            id: this.lastID,
            category_id: Number(category_id),
            name,
            description,
            price: Number(price),
            status: status || 'available',
            business_id: businessId,
            image_url: image_url ? `${req.protocol}://${req.get('host')}/uploads/${image_url}` : null
        });
        }); // End db.run INSERT
    }); // End db.get Category Check
});

// --- Menü Öğesi Güncelle (Admin Gerekli) ---
router.put('/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { category_id, name, description, price, status, remove_image } = req.body;
    const businessId = req.user.business_id;
    let image_url_to_update = null; // Veritabanına yazılacak değer
    let oldImageUrl = null; // Silinecek eski resmin adı

    // Önce mevcut öğeyi ve eski resim yolunu al
    // Önce mevcut öğeyi, eski resmi ve işletme ID'sini al (güvenlik kontrolü)
    db.get('SELECT image_url, business_id FROM menu_items WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Güncelleme için eski öğe alınamadı:', err.message);
            // Yeni resim yüklendiyse sil
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        if (!row) {
             if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Güncellenecek menü öğesi bulunamadı.' });
        }
        // İşletme kontrolü
        if (row.business_id !== businessId) {
             if (req.file) fs.unlinkSync(req.file.path);
             return res.status(403).json({ message: 'Bu öğeyi güncelleme yetkiniz yok.' });
        }
        oldImageUrl = row.image_url; // Eski resim adını sakla

        // Güncelleme mantığı
        if (req.file) {
            // 1. Yeni resim yüklendi
            image_url_to_update = req.file.filename;
        } else if (remove_image === 'true' || remove_image === true) {
             // 2. Resim kaldırılmak istendi (remove_image flag'i true)
            image_url_to_update = null; // Veritabanında null yap
        } else {
            // 3. Resim güncellenmedi veya kaldırılmadı
            image_url_to_update = oldImageUrl; // Eski resmi koru
        }

        // Gerekli alan kontrolü
        if (!category_id || !name || price === undefined) {
            if (req.file) fs.unlinkSync(req.file.path); // Yeni resim yüklendiyse sil
            return res.status(400).json({ message: 'Kategori ID, isim ve fiyat gereklidir.' });
        }

        // Kategori ID'sinin de bu işletmeye ait olduğunu kontrol et (eğer kategori değiştiyse)
        db.get('SELECT id FROM categories WHERE id = ? AND business_id = ?', [category_id, businessId], (catErr, category) => {
            if (catErr) {
                console.error("Güncelleme için kategori kontrol hatası:", catErr.message);
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(500).json({ message: "Sunucu hatası." });
            }
            if (!category) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: "Geçersiz veya bu işletmeye ait olmayan kategori ID." });
            }

            // Kategori geçerliyse güncellemeye devam et
            const sql = `UPDATE menu_items SET
                            category_id = ?,
                            name = ?,
                            description = ?,
                            price = ?,
                            status = ?,
                            image_url = ?
                         WHERE id = ? AND business_id = ?`; // business_id kontrolü eklendi
        const params = [
            category_id,
            name,
            description || null,
            price,
            status || 'available',
            image_url_to_update, // Yeni veya eski resim adı ya da null
            id,
            businessId // WHERE koşulu için
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Menü öğesi güncelleme hatası:', err.message);
                if (req.file) fs.unlinkSync(req.file.path); // Hata durumunda yeni resmi sil
                return res.status(500).json({ message: 'Sunucu hatası.' });
            }
            if (this.changes === 0) {
                // Bu durum aslında yukarıdaki 404 kontrolü ile yakalanmalı ama yine de ekleyelim.
                 if (req.file) fs.unlinkSync(req.file.path);
                return res.status(404).json({ message: 'Güncellenecek menü öğesi bulunamadı veya bu işletmeye ait değil.' });
            }

            // Güncelleme başarılıysa ve yeni bir resim yüklendiyse VEYA resim kaldırıldıysa, eski resmi sil
            if (oldImageUrl && (req.file || (remove_image === 'true' || remove_image === true))) {
                const oldPath = path.join(__dirname, '../uploads/', oldImageUrl);
                fs.unlink(oldPath, (unlinkErr) => {
                    if (unlinkErr) console.error("Eski resim silinemedi:", unlinkErr);
                });
            }


            res.json({
                message: 'Menü öğesi başarıyla güncellendi.',
                id: Number(id),
                image_url: image_url_to_update ? `${req.protocol}://${req.get('host')}/uploads/${image_url_to_update}` : null // Güncel URL'yi döndür
            });
            }); // End db.run (UPDATE)
        }); // End db.get (Category Check)
    }); // End db.get (Initial Item Check)


});


// --- Menü Öğesi Sil (Admin Gerekli) ---
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const businessId = req.user.business_id;

    // Önce silinecek öğenin resim yolunu al
    // Önce silinecek öğenin resim yolunu ve işletme ID'sini al (güvenlik kontrolü)
    db.get('SELECT image_url, business_id FROM menu_items WHERE id = ?', [id], (err, row) => {
         if (err) {
            console.error('Silme için öğe alınamadı:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        if (row && row.business_id !== businessId) {
             return res.status(403).json({ message: 'Bu öğeyi silme yetkiniz yok.' });
        }
        // Öğe bulunamazsa veya işletme ID'si eşleşmezse, silme işlemi 0 değişiklik döndürecektir.

        const sql = 'DELETE FROM menu_items WHERE id = ? AND business_id = ?';
        db.run(sql, [id, businessId], function(err) {
            if (err) {
                console.error('Menü öğesi silme hatası:', err.message);
                return res.status(500).json({ message: 'Sunucu hatası.' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Silinecek menü öğesi bulunamadı veya bu işletmeye ait değil.' });
            }

            // Silme başarılıysa ve öğenin bir resmi varsa, resmi de sil
            if (row && row.image_url) {
                const imagePath = path.join(__dirname, '../uploads/', row.image_url);
                fs.unlink(imagePath, (unlinkErr) => {
                    if (unlinkErr) {
                        // Loglama yapabiliriz ama kullanıcıya hata döndürmeye gerek yok, ana işlem başarılı.
                        console.error("İlişkili resim silinemedi:", unlinkErr);
                    } else {
                        console.log(`İlişkili resim silindi: ${row.image_url}`);
                    }
                });
            }

            res.json({ message: 'Menü öğesi başarıyla silindi.' });
        });
    });
});


module.exports = router;