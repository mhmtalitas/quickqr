import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import styles from './CategoryContent.module.css';
import ItemDetailView from './ItemDetailView';
import { testCategoryData } from '../pages/PublicMenuPage';

function CategoryContent() {
  const { restaurantId, categoryId } = useParams();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchCategoryItems = async () => {
      // Önce test verilerini gösterelim ki sayfa hızlıca yüklensin
      setCategory(testCategoryData);
      setLoading(false);
      
      // Ardından API'den veri almayı deneyelim
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        
        // Kategori ve öğeleri alınıyor
        const response = await axios.get(`${apiUrl}/public/menu-items`);
        if (response.data && response.data.length > 0) {
          const items = response.data.filter(item => item.category_id === parseInt(categoryId));
          
          if (items.length > 0) {
            // API verilerini kullanarak kategori oluşturuluyor
            const apiCategory = {
              id: parseInt(categoryId),
              name: testCategoryData.name, // Veya API'den kategori bilgisi ayrıca alınabilir
              items: items.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description || '',
                price: item.price,
                image_url: item.image_url || `https://via.placeholder.com/500x300/${getRandomColor()}?text=${encodeURIComponent(item.name)}`
              }))
            };
            
            setCategory(apiCategory);
          }
        }
      } catch (err) {
        console.log('API bağlantısı kurulamadı, test verileri gösteriliyor.');
        // API hatası olduğunda zaten test verileri gösteriliyor
      }
    };

    if (categoryId) {
      fetchCategoryItems();
    }
  }, [categoryId, restaurantId]);

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const handleCloseItemDetail = () => {
    setSelectedItem(null);
  };

  if (loading) {
    return <div className={styles.loading}>Yükleniyor...</div>;
  }

  if (!category) {
    return <div className={styles.error}>Kategori bulunamadı.</div>;
  }

  if (selectedItem) {
    return <ItemDetailView item={selectedItem} onClose={handleCloseItemDetail} />;
  }

  return (
    <div className={styles.categoryContent}>
      <header className={styles.header}>
        <div className={styles.backButton}>
          <Link to={`/menu/${restaurantId || 'default-business'}`}>
            <span className={styles.backArrow}>←</span> Geri
          </Link>
        </div>
        <h1>{category.name}</h1>
      </header>

      <div className={styles.menuItems}>
        {category.items && category.items.map((item) => (
          <div 
            key={item.id} 
            className={styles.menuItem}
            onClick={() => handleItemClick(item)}
          >
            <div className={styles.menuItemContent}>
              {item.image_url && (
                <div className={styles.imageContainer}>
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className={styles.itemImage}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              
              <div className={styles.itemDetails}>
                <h2 className={styles.itemName}>{item.name}</h2>
                <p className={styles.itemDescription}>{item.description}</p>
              </div>
              
              <div className={styles.itemPriceContainer}>
                <span className={styles.itemPrice}>{item.price.toFixed(2)} ₺</span>
              </div>
            </div>
          </div>
        ))}

        {(!category.items || category.items.length === 0) && (
          <p className={styles.noItems}>Bu kategoride ürün bulunmamaktadır.</p>
        )}
      </div>
    </div>
  );
}

// Rastgele placeholder rengi için yardımcı fonksiyon
function getRandomColor() {
  const colors = ['FFB6C1', 'ADD8E6', '90EE90', 'FFFFE0', 'E6E6FA', 'F0E68C', 'D3D3D3'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default CategoryContent; 