const express = require('express');
const db = require('../database');
const path = require('path');

const router = express.Router();

// Root endpoint - Sistemin çalıştığını kontrol et
router.get('/', (req, res) => {
    res.json({ message: 'Public API çalışıyor!' });
});

// Test için işletmeleri listeleyelim
router.get('/businesses', (req, res) => {
    db.all('SELECT * FROM businesses', [], (err, businesses) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(businesses);
    });
});

// Test için tüm kategorileri listeleyelim
router.get('/categories', (req, res) => {
    db.all('SELECT * FROM categories', [], (err, categories) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(categories);
    });
});

// Test için tüm menü öğelerini listeleyelim
router.get('/menu-items', (req, res) => {
    db.all('SELECT * FROM menu_items', [], (err, items) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(items);
    });
});

// Demo menüsünü doğrudan göster - Hata ayıklama
router.get('/demo', (req, res) => {
    console.log('Demo menüsü istendi...');
    // 1. Adım: Varsayılan işletmeyi bul
    db.get('SELECT id, name, logo_url FROM businesses WHERE slug = ?', ['default-business'], (err, business) => {
        if (err) {
            console.error('İşletme bilgisi alınamadı:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        if (!business) {
            console.error('Varsayılan işletme bulunamadı!');
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }

        console.log('Varsayılan işletme bulundu:', business);
        const businessId = business.id;

        // 2. Adım: Kategorileri al
        db.all('SELECT * FROM categories WHERE business_id = ?', [businessId], (err, categories) => {
            if (err) {
                console.error('Kategoriler alınamadı:', err.message);
                return res.status(500).json({ message: 'Sunucu hatası.' });
            }

            console.log(`${categories.length} kategori bulundu`);
            
            // 3. Adım: Menü öğelerini al
            db.all('SELECT * FROM menu_items WHERE business_id = ?', [businessId], (err, items) => {
                if (err) {
                    console.error('Menü öğeleri alınamadı:', err.message);
                    return res.status(500).json({ message: 'Sunucu hatası.' });
                }

                console.log(`${items.length} menü öğesi bulundu`);
                
                // Kategorileri hazırla
                const formattedCategories = categories.map(category => {
                    // Bu kategoriye ait öğeleri filtrele
                    const categoryItems = items.filter(item => item.category_id === category.id);
                    
                    return {
                        id: category.id,
                        name: category.name,
                        description: category.description,
                        image_url: `https://via.placeholder.com/300x200/${getRandomColor()}?text=${encodeURIComponent(category.name)}`,
                        items: categoryItems.map(item => ({
                            id: item.id,
                            name: item.name,
                            description: item.description,
                            price: item.price,
                            image_url: item.image_url || `https://via.placeholder.com/500x300/${getRandomColor()}?text=${encodeURIComponent(item.name)}`
                        }))
                    };
                });
                
                // Sadece öğesi olan kategorileri göster
                const finalCategories = formattedCategories.filter(category => category.items.length > 0);

                // Sonucu döndür
                res.json({
                    restaurantInfo: {
                        name: business.name,
                        logo_url: business.logo_url || null
                    },
                    categories: finalCategories
                });
            });
        });
    });
});

// --- Belirli Bir İşletmenin Menüsünü Getir (Public) ---
router.get('/menu/:businessSlug', (req, res) => {
    const { businessSlug } = req.params;
    console.log(`>>> Menü istendi: ${businessSlug}`);

    // Özel durum: Varsayılan işletme için demo endpoint'ine yönlendir
    if (businessSlug === 'default-business') {
        console.log('Varsayılan işletme istendi, demo endpoint\'ine yönlendiriliyor...');
        return res.redirect('/api/public/demo');
    }

    // Normal işletme menüsü endpoint'i buradan devam eder...
    // 1. Adım: İşletme bilgilerini slug ile bul
    db.get('SELECT id, name, logo_url FROM businesses WHERE slug = ?', [businessSlug], (err, business) => {
        if (err) {
            console.error('İşletme bilgisi alınamadı:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }

        const businessId = business.id;
        const menu = {}; // Kategorileri ve öğelerini tutacak nesne

        // 2. Adım: Bu işletmeye ait kategorileri al
        db.all('SELECT * FROM categories WHERE business_id = ? ORDER BY name', [businessId], (catErr, categories) => {
            if (catErr) {
                console.error('Menü için kategori alınamadı:', catErr.message);
                return res.status(500).json({ message: 'Sunucu hatası.' });
            }

            if (!categories || categories.length === 0) {
                // Kategori yoksa sadece işletme bilgisini döndür
                 return res.json({
                    restaurantInfo: { 
                        name: business.name,
                        logo_url: business.logo_url ? `${req.protocol}://${req.get('host')}/uploads/${business.logo_url}` : null // Logo URL'sini de tam yapalım (varsa)
                    },
                    categories: []
                });
            }

            // Kategorileri ID'lerine göre map'le
            categories.forEach(category => {
                menu[category.id] = {
                    id: category.id,
                    name: category.name,
                    description: category.description, // Açıklamayı da ekleyelim
                    items: []
                };
            });

            // 3. Adım: Bu işletmeye ait 'available' menü öğelerini al
            const sqlItems = `
                SELECT * FROM menu_items
                WHERE business_id = ? AND status = 'available'
                ORDER BY name
            `;
            db.all(sqlItems, [businessId], (itemErr, items) => {
                if (itemErr) {
                    console.error('Menü için öğeler alınamadı:', itemErr.message);
                    return res.status(500).json({ message: 'Sunucu hatası.' });
                }

                // Öğeleri ilgili kategorilere ekle
                items.forEach(item => {
                    if (menu[item.category_id]) {
                        menu[item.category_id].items.push({
                            id: item.id, // Gereksiz alanları çıkarabiliriz (örn: category_id, business_id, status)
                            name: item.name,
                            description: item.description,
                            price: item.price,
                            image_url: item.image_url ? `${req.protocol}://${req.get('host')}/uploads/${item.image_url}` : null
                        });
                    }
                });

                // Sonuç: Kategori ID'si anahtar olan nesneyi diziye çevir ve sadece içinde ürün olanları filtrele
                const finalCategories = Object.values(menu).filter(category => category.items.length > 0);
                
                // Ayrıca görsel ekleyelim
                finalCategories.forEach(category => {
                    // Varsayılan görseller
                    category.image_url = `https://via.placeholder.com/300x200/${getRandomColor()}?text=${encodeURIComponent(category.name)}`;
                });

                res.json({
                     restaurantInfo: { 
                        name: business.name,
                        logo_url: business.logo_url ? `${req.protocol}://${req.get('host')}/uploads/${business.logo_url}` : null
                    },
                    categories: finalCategories
                });
            }); // End db.all items
        }); // End db.all categories
    }); // End db.get business
});

// Bir işletmenin belirli bir kategorisinin detaylarını al
router.get('/menu/:businessSlug/category/:categoryId', (req, res) => {
    const { businessSlug, categoryId } = req.params;
    
    console.log(`>>> Request received for /menu/${businessSlug}/category/${categoryId}`);

    // İşletmeyi bul
    db.get('SELECT id, name FROM businesses WHERE slug = ?', [businessSlug], (err, business) => {
        if (err) {
            console.error('İşletme bilgisi alınamadı:', err.message);
            return res.status(500).json({ message: 'Sunucu hatası.' });
        }
        if (!business) {
            return res.status(404).json({ message: 'İşletme bulunamadı.' });
        }

        const businessId = business.id;

        // Kategoriyi bul
        db.get('SELECT * FROM categories WHERE id = ? AND business_id = ?', [categoryId, businessId], (catErr, category) => {
            if (catErr) {
                console.error('Kategori bilgisi alınamadı:', catErr.message);
                return res.status(500).json({ message: 'Sunucu hatası.' });
            }
            if (!category) {
                return res.status(404).json({ message: 'Kategori bulunamadı.' });
            }

            // Bu kategorideki tüm menü öğelerini al
            db.all('SELECT * FROM menu_items WHERE category_id = ? AND business_id = ? AND status = "available" ORDER BY name', [categoryId, businessId], (itemErr, items) => {
                if (itemErr) {
                    console.error('Menü öğeleri alınamadı:', itemErr.message);
                    return res.status(500).json({ message: 'Sunucu hatası.' });
                }

                // Menü öğelerini formatla
                const formattedItems = items.map(item => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    image_url: item.image_url ? `${req.protocol}://${req.get('host')}/uploads/${item.image_url}` : 
                        `https://via.placeholder.com/500x300/${getRandomColor()}?text=${encodeURIComponent(item.name)}`
                }));

                // Sonucu gönder
                res.json({
                    id: category.id,
                    name: category.name,
                    description: category.description,
                    items: formattedItems
                });
            });
        });
    });
});

// Rastgele placeholder rengi için yardımcı fonksiyon
function getRandomColor() {
    const colors = ['FFB6C1', 'ADD8E6', '90EE90', 'FFFFE0', 'E6E6FA', 'F0E68C', 'D3D3D3'];
    return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = router;