const express = require('express');
const db = require('../database');
const { authenticateToken } = require('./auth'); // Token doğrulama middleware'ini import et
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Uploads klasörünü oluştur
try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const categoriesDir = path.join(uploadsDir, 'categories');
    
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
        console.log('Uploads dizini oluşturuldu:', uploadsDir);
    }
    
    if (!fs.existsSync(categoriesDir)) {
        fs.mkdirSync(categoriesDir);
        console.log('Categories dizini oluşturuldu:', categoriesDir);
    }
} catch (err) {
    console.error('Klasör oluşturma hatası:', err);
}

// Görsel yükleme için multer konfigürasyonu
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        // Her zaman uploads/categories klasörüne kaydet
        const uploadPath = path.join(__dirname, '..', 'uploads', 'categories');
        console.log('Dosya yükleme için kullanılan klasör:', uploadPath);
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        // Benzersiz dosya adı oluştur
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname) || '.jpg'; // Uzantı yoksa .jpg kullan
        const newFilename = uniqueSuffix + extension;
        console.log('Oluşturulan dosya adı:', newFilename);
        cb(null, newFilename);
    }
});

// Hata ayıklama için file filter
const fileFilter = (req, file, cb) => {
    // Tüm dosyaları kabul et ve log'la
    console.log('Gelen dosya:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });
    
    // Tüm dosya tiplerini kabul et (güvenlik için gerçek uygulamalarda kısıtlama yapılmalı)
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB'a kadar izin ver
});

// --- İşletmeye Ait Kategorileri Getir (Admin Gerekli) ---
router.get('/', authenticateToken, (req, res) => {
    const businessId = req.user.business_id;

    db.all('SELECT * FROM categories WHERE business_id = ? ORDER BY name', [businessId], (err, categories) => {
        if (err) {
            console.error('Kategori listeleme hatası:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        
        // Görsel URL'lerini kategorilere ekle
        const categoriesWithImageUrls = categories.map(category => {
            let image_url = null;
            
            if (category.image_path) {
                const fileName = path.basename(category.image_path);
                image_url = `${req.protocol}://${req.get('host')}/uploads/categories/${fileName}`;
            }
            
            return {
                ...category,
                image_url: image_url
            };
        });
        
        res.json(categoriesWithImageUrls);
    });
});

// --- Yeni Kategori Ekle (Admin Gerekli) ---
router.post('/', function(req, res) {
    console.log('Kategori ekleme isteği alındı (Form verisi):', req.body);
    
    try {
        // Önce token kontrolü yapalım
        authenticateToken(req, res, function(err) {
            if (err) {
                console.error('Token doğrulama hatası:', err);
                return res.status(401).json({ message: 'Yetkilendirme başarısız. Lütfen tekrar giriş yapın.' });
            }
            
            // Dosya yükleme işlemini başlatalım
            upload.single('image')(req, res, function(uploadErr) {
                if (uploadErr) {
                    console.error('Dosya yükleme hatası:', uploadErr);
                    return res.status(500).json({ message: 'Dosya yüklenirken hata: ' + uploadErr.message });
                }
                
                try {
                    console.log('Token ve dosya kontrolleri başarılı');
                    console.log('Yüklenen dosya:', req.file);
                    
                    // Form verilerini kontrol et
                    const { name, description } = req.body;
                    const businessId = req.user.business_id;
                    
                    console.log('İşlenen veriler:', {
                        name,
                        description,
                        businessId,
                        hasFile: req.file ? true : false
                    });
                    
                    if (!name || name.trim() === '') {
                        return res.status(400).json({ message: 'Kategori adı gerekli' });
                    }
                    
                    // Dosya yolu oluştur
                    let image_path = null;
                    if (req.file) {
                        image_path = req.file.path;
                        console.log('Dosya yolu:', image_path);
                    }
                    
                    // Veritabanı işlemini başlat
                    db.run(
                        'INSERT INTO categories (name, description, business_id, image_path) VALUES (?, ?, ?, ?)',
                        [name, description || null, businessId, image_path],
                        function(dbErr) {
                            if (dbErr) {
                                console.error('Veritabanı hatası:', dbErr.message);
                                return res.status(500).json({ message: 'Veritabanı hatası: ' + dbErr.message });
                            }
                            
                            const newCategoryId = this.lastID;
                            console.log('Eklenen kategori ID:', newCategoryId);
                            
                            // Yanıt nesnesini oluştur
                            const result = {
                                id: newCategoryId,
                                name: name,
                                description: description || null,
                                business_id: businessId,
                                image_path: image_path
                            };
                            
                            if (image_path) {
                                result.image_url = `${req.protocol}://${req.get('host')}/uploads/categories/${path.basename(image_path)}`;
                                console.log('Oluşturulan image_url:', result.image_url);
                            } else {
                                result.image_url = null;
                            }
                            
                            // Yanıt gönder
                            res.status(201).json(result);
                        }
                    );
                } catch (error) {
                    console.error('Veri işleme hatası:', error);
                    res.status(500).json({ message: 'Veri işleme hatası: ' + error.message });
                }
            });
        });
    } catch (error) {
        console.error('Genel hata:', error);
        res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
    }
});

// --- Kategori Güncelle (Admin Gerekli) ---
router.put('/:id', function(req, res) {
    const { id } = req.params;
    console.log('Kategori güncelleme isteği (ID:', id, ') Form verisi:', req.body);
    
    try {
        // Token kontrolü
        authenticateToken(req, res, function(authErr) {
            if (authErr) {
                console.error('Token doğrulama hatası:', authErr);
                return res.status(401).json({ message: 'Yetkilendirme başarısız. Lütfen tekrar giriş yapın.' });
            }
            
            // Dosya yükleme
            upload.single('image')(req, res, function(uploadErr) {
                if (uploadErr) {
                    console.error('Dosya yükleme hatası:', uploadErr);
                    return res.status(500).json({ message: 'Dosya yüklenirken hata: ' + uploadErr.message });
                }
                
                try {
                    console.log('Token ve dosya kontrolleri başarılı');
                    console.log('Yüklenen dosya:', req.file);
                    
                    // Form verilerini kontrol et
                    const { name, description } = req.body;
                    const businessId = req.user.business_id;
                    
                    console.log('İşlenen veriler:', {
                        categoryId: id,
                        name,
                        description,
                        businessId,
                        hasFile: req.file ? true : false
                    });
                    
                    if (!name || name.trim() === '') {
                        return res.status(400).json({ message: 'Kategori adı gerekli' });
                    }
                    
                    // Önce kategoriyi kontrol et
                    db.get('SELECT * FROM categories WHERE id = ? AND business_id = ?', [id, businessId], function(findErr, category) {
                        if (findErr) {
                            console.error('Kategori arama hatası:', findErr);
                            return res.status(500).json({ message: 'Veritabanı hatası: ' + findErr.message });
                        }
                        
                        if (!category) {
                            return res.status(404).json({ message: 'Kategori bulunamadı veya erişim izniniz yok' });
                        }
                        
                        console.log('Mevcut kategori bilgisi:', category);
                        
                        // Dosya yolu güncelleme
                        let image_path = category.image_path;
                        if (req.file) {
                            image_path = req.file.path;
                            console.log('Yeni dosya yolu:', image_path);
                        }
                        
                        // Veritabanını güncelle
                        db.run(
                            'UPDATE categories SET name = ?, description = ?, image_path = ? WHERE id = ? AND business_id = ?',
                            [name, description || null, image_path, id, businessId],
                            function(updateErr) {
                                if (updateErr) {
                                    console.error('Güncelleme SQL hatası:', updateErr);
                                    return res.status(500).json({ message: 'Güncelleme hatası: ' + updateErr.message });
                                }
                                
                                console.log('Güncelleme başarılı, değiştirilen satır:', this.changes);
                                
                                // Yanıt nesnesini oluştur
                                const result = {
                                    id: parseInt(id),
                                    name,
                                    description: description || null,
                                    business_id: businessId,
                                    image_path: image_path
                                };
                                
                                if (image_path) {
                                    result.image_url = `${req.protocol}://${req.get('host')}/uploads/categories/${path.basename(image_path)}`;
                                    console.log('Oluşturulan image_url:', result.image_url);
                                } else {
                                    result.image_url = null;
                                }
                                
                                // Yanıt gönder
                                res.json(result);
                            }
                        );
                    });
                } catch (error) {
                    console.error('Veri işleme hatası:', error);
                    res.status(500).json({ message: 'Veri işleme hatası: ' + error.message });
                }
            });
        });
    } catch (error) {
        console.error('Genel hata:', error);
        res.status(500).json({ message: 'Sunucu hatası: ' + error.message });
    }
});

// --- Kategori Sil (Admin Gerekli) ---
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const businessId = req.user.business_id;
    
    // Önce kategoriyi bul
    db.get('SELECT * FROM categories WHERE id = ? AND business_id = ?', [id, businessId], (err, category) => {
        if (err) {
            console.error('Kategori bulma hatası:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası' });
        }
        
        if (!category) {
            return res.status(404).json({ message: 'Kategori bulunamadı' });
        }
        
        // Kategoriyi sil
        db.run('DELETE FROM categories WHERE id = ? AND business_id = ?', [id, businessId], function(err) {
            if (err) {
                console.error('Kategori silme hatası:', err.message);
                return res.status(500).json({ message: 'Kategori silinirken hata' });
            }
            
            res.json({ message: 'Kategori başarıyla silindi' });
        });
    });
});

module.exports = router;