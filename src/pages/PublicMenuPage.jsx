import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './PublicMenuPage.module.css';
import CategoryCard from '../components/CategoryCard';
import CategoryContent from '../components/CategoryContent';

// Test veri seti - API yanıt vermediğinde kullanılacak
const testData = {
  restaurantInfo: {
    id: 'default-business',
    name: 'Demo - Kolayrestoran!'
  },
  categories: [
    {
      id: 1,
      name: 'Makarnalar',
      image_url: 'https://via.placeholder.com/300x200/FFB6C1/000000?text=Makarnalar'
    },
    {
      id: 2,
      name: 'Burgerler',
      image_url: 'https://via.placeholder.com/300x200/ADD8E6/000000?text=Burgerler'
    },
    {
      id: 3,
      name: 'Pizzalar',
      image_url: 'https://via.placeholder.com/300x200/90EE90/000000?text=Pizzalar'
    },
    {
      id: 4,
      name: 'İçecekler',
      image_url: 'https://via.placeholder.com/300x200/FFFFE0/000000?text=İçecekler'
    },
    {
      id: 5,
      name: 'Tatlılar',
      image_url: 'https://via.placeholder.com/300x200/E6E6FA/000000?text=Tatlılar'
    },
    {
      id: 6,
      name: 'Başlangıçlar',
      image_url: 'https://via.placeholder.com/300x200/F0E68C/000000?text=Başlangıçlar'
    }
  ]
};

// Test kategori içeriği - API yanıt vermediğinde kullanılacak
export const testCategoryData = {
  id: 2,
  name: 'Burgerler',
  items: [
    {
      id: 1,
      name: 'Füme Etli Burger',
      description: '120 gr. hamburger köftesi, füme et, mor soğan, domates.',
      price: 34,
      image_url: 'https://via.placeholder.com/500x300/ADD8E6/000000?text=Füme+Etli+Burger',
      options: [
        { id: 1, name: 'Ekstra Cheddar', price: 3 },
        { id: 2, name: 'Ekstra Füme Et', price: 4 }
      ]
    },
    {
      id: 2,
      name: 'Tavuk Burger',
      description: '120 gr tavuk köftesi, cheddar, domates, turşu, mayonez',
      price: 28,
      image_url: 'https://via.placeholder.com/500x300/ADD8E6/000000?text=Tavuk+Burger'
    },
    {
      id: 3,
      name: 'Karamelize Soğanlı Burger',
      description: '120 gr. hamburger köftesi, karamelize soğan, cheddar',
      price: 31,
      image_url: 'https://via.placeholder.com/500x300/ADD8E6/000000?text=Karamelize+Soğanlı+Burger'
    },
    {
      id: 4,
      name: 'Hawaii Burger',
      description: '120 gr. hamburger köftesi, ızgara ananas, cheddar, marul, domates, mor soğan.',
      price: 31,
      image_url: 'https://via.placeholder.com/500x300/ADD8E6/000000?text=Hawaii+Burger'
    },
    {
      id: 5,
      name: 'Ranch Burger',
      description: '120 gr. hamburger köftesi, ranch sos, domates, marul, cheddar.',
      price: 31,
      image_url: 'https://via.placeholder.com/500x300/ADD8E6/000000?text=Ranch+Burger'
    }
  ]
};

function MenuHome() {
    const { restaurantId } = useParams();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [restaurantInfo, setRestaurantInfo] = useState(null);

    useEffect(() => {
        const fetchMenu = async () => {
            // Önce test verilerini gösterelim ki sayfa hızlıca yüklensin
            setRestaurantInfo(testData.restaurantInfo);
            setCategories(testData.categories);
            setLoading(false);
            
            // Ardından API'den veri almayı deneyelim
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                
                // Kategori listesi alınıyor
                const response = await axios.get(`${apiUrl}/public/categories`);
                if (response.data && response.data.length > 0) {
                    // Kategori verileri biçimlendiriliyor
                    const formattedCategories = response.data.map(category => ({
                        id: category.id,
                        name: category.name,
                        description: category.description || '',
                        image_url: `https://via.placeholder.com/300x200/${getRandomColor()}?text=${encodeURIComponent(category.name)}`
                    }));
                    
                    setCategories(formattedCategories);
                    
                    // İşletme bilgilerini varsayılan değerler olarak ayarlıyoruz
                    setRestaurantInfo({
                        name: 'Restoran Menü'
                    });
                }
            } catch (err) {
                console.log('API bağlantısı kurulamadı, test verileri gösteriliyor.');
                // API hatası olduğunda zaten test verileri gösteriliyor
            }
        };

        fetchMenu();
    }, [restaurantId]);

    if (loading) {
        return <div className={styles.loading}>Menü Yükleniyor...</div>;
    }

    if (!categories || categories.length === 0) {
        return <div className={styles.loading}>Gösterilecek kategori bulunamadı.</div>;
    }

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <h1>{restaurantInfo?.name || "Restoran Menüsü"}</h1>
            </header>

            <div className={styles.categoriesGrid}>
                {categories.map((category) => (
                    <CategoryCard 
                        key={category.id} 
                        category={category} 
                        restaurantId={restaurantId || 'default-business'} 
                    />
                ))}
            </div>
        </div>
    );
}

// Rastgele placeholder rengi için yardımcı fonksiyon
function getRandomColor() {
    const colors = ['FFB6C1', 'ADD8E6', '90EE90', 'FFFFE0', 'E6E6FA', 'F0E68C', 'D3D3D3'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function PublicMenuPage() {
    return (
        <Routes>
            <Route index element={<MenuHome />} />
            <Route path=":restaurantId" element={<MenuHome />} />
            <Route path=":restaurantId/category/:categoryId" element={<CategoryContent />} />
        </Routes>
    );
}

export default PublicMenuPage;