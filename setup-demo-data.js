const db = require('./database');

function setupDemoData() {
    console.log('Örnek menü verileri ekleniyor...');

    // İlk olarak varsayılan işletme ID'sini alalım
    db.get('SELECT id FROM businesses WHERE slug = ?', ['default-business'], (err, business) => {
        if (err) {
            console.error('İşletme bilgisi alınamadı:', err.message);
            process.exit(1);
        }

        if (!business) {
            console.error('Varsayılan işletme bulunamadı! Önce database.js ile veritabanını başlatın.');
            process.exit(1);
        }

        const businessId = business.id;
        console.log(`İşletme ID: ${businessId}`);

        // Önce örnek kategoriler ekleyelim
        const categories = [
            { name: 'Burgerler', description: 'Enfes burger çeşitlerimiz', businessId },
            { name: 'Pizzalar', description: 'İtalyan usulü pizza çeşitlerimiz', businessId },
            { name: 'Makarnalar', description: 'Makarna çeşitlerimiz', businessId },
            { name: 'İçecekler', description: 'Soğuk ve sıcak içecek çeşitlerimiz', businessId },
            { name: 'Tatlılar', description: 'Tatlı çeşitlerimiz', businessId }
        ];

        // Seri olarak ekleyelim
        db.serialize(() => {
            // Önce kategorileri ekle
            const stmt = db.prepare('INSERT INTO categories (name, description, business_id) VALUES (?, ?, ?)');
            
            // Her kategoriyi ekle ve ID'sini al
            let categoryIds = {};
            
            categories.forEach(category => {
                stmt.run(category.name, category.description, category.businessId, function(err) {
                    if (err) {
                        console.error(`Kategori eklenirken hata: ${category.name}`, err.message);
                        return;
                    }
                    
                    categoryIds[category.name] = this.lastID;
                    console.log(`Kategori eklendi: ${category.name} (ID: ${this.lastID})`);
                    
                    // Son kategori eklendiyse, ürünleri ekle
                    if (Object.keys(categoryIds).length === categories.length) {
                        addMenuItems(categoryIds, businessId);
                    }
                });
            });
            
            stmt.finalize();
        });
    });
}

function addMenuItems(categoryIds, businessId) {
    console.log('Menü öğeleri ekleniyor...');

    const menuItems = [
        {
            categoryName: 'Burgerler',
            items: [
                { name: 'Klasik Burger', description: '150gr dana eti, cheddar peyniri, domates, marul, özel sos', price: 55.90 },
                { name: 'Tavuk Burger', description: 'Izgara tavuk göğsü, marul, domates, ranch sos', price: 45.90 },
                { name: 'Mantarlı Burger', description: 'Dana eti, mantar, karamelize soğan, cheddar peyniri', price: 60.90 },
                { name: 'Vegan Burger', description: 'Sebze köftesi, avokado, roka, kırmızı soğan', price: 50.90 }
            ]
        },
        {
            categoryName: 'Pizzalar',
            items: [
                { name: 'Margarita', description: 'Domates sos, mozzarella peyniri, fesleğen', price: 70.90 },
                { name: 'Karışık Pizza', description: 'Domates sos, mozzarella, sucuk, sosis, mantar, biber', price: 85.90 },
                { name: 'Ton Balıklı Pizza', description: 'Domates sos, mozzarella, ton balığı, kırmızı soğan', price: 80.90 }
            ]
        },
        {
            categoryName: 'Makarnalar',
            items: [
                { name: 'Bolonez Soslu Makarna', description: 'Kıymalı domates soslu makarna, parmesan peyniri', price: 65.90 },
                { name: 'Arabiata', description: 'Acılı domates soslu makarna, sarımsak', price: 55.90 },
                { name: 'Kremalı Mantar Soslu', description: 'Krema, mantar, sarımsak', price: 60.90 }
            ]
        },
        {
            categoryName: 'İçecekler',
            items: [
                { name: 'Cola', description: '330ml', price: 15.00 },
                { name: 'Ayran', description: '250ml', price: 10.00 },
                { name: 'Meyve Suyu', description: 'Portakal, elma, şeftali seçenekleri', price: 12.00 },
                { name: 'Türk Kahvesi', description: 'Geleneksel Türk kahvesi', price: 20.00 }
            ]
        },
        {
            categoryName: 'Tatlılar',
            items: [
                { name: 'Cheesecake', description: 'Ev yapımı klasik cheesecake', price: 35.00 },
                { name: 'Sütlaç', description: 'Ev yapımı fırınlanmış sütlaç', price: 30.00 },
                { name: 'Baklava', description: '3 dilim fıstıklı baklava', price: 40.00 }
            ]
        }
    ];

    db.serialize(() => {
        const stmt = db.prepare('INSERT INTO menu_items (category_id, name, description, price, business_id, status) VALUES (?, ?, ?, ?, ?, ?)');
        
        menuItems.forEach(category => {
            const categoryId = categoryIds[category.categoryName];
            
            if (!categoryId) {
                console.error(`"${category.categoryName}" kategorisi için ID bulunamadı!`);
                return;
            }
            
            category.items.forEach(item => {
                stmt.run(categoryId, item.name, item.description, item.price, businessId, 'available', function(err) {
                    if (err) {
                        console.error(`Menü öğesi eklenirken hata: ${item.name}`, err.message);
                        return;
                    }
                    console.log(`Menü öğesi eklendi: ${item.name} (ID: ${this.lastID})`);
                });
            });
        });
        
        stmt.finalize();
        
        console.log('Demo veriler başarıyla eklendi!');
    });
}

// Script doğrudan çalıştırıldıysa
if (require.main === module) {
    setupDemoData();
}

module.exports = { setupDemoData }; 