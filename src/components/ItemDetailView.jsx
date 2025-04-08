import React from 'react';
import styles from './CategoryContent.module.css'; // Reusing styles from CategoryContent

function ItemDetailView({ item, onClose }) {
  if (!item) return null;

  return (
    <div className={styles.itemDetailView}>
      {item.image_url && (
        <div className={styles.itemDetailImageContainer}>
          <img 
            src={item.image_url} 
            alt={item.name} 
            className={styles.itemDetailImage}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
      
      <div className={styles.itemDetailContent}>
        <div className={styles.itemDetailHeader}>
          <h2 className={styles.itemDetailName}>{item.name}</h2>
          <span className={styles.itemDetailPrice}>{item.price.toFixed(2)} ₺</span>
        </div>
        
        <p className={styles.itemDetailDescription}>{item.description}</p>
        
        {item.options && item.options.length > 0 && (
          <div className={styles.itemOptions}>
            <h3 className={styles.itemOptionsTitle}>İlaveler/Seçenekler</h3>
            
            {item.options.map((option) => (
              <div key={option.id} className={styles.optionItem}>
                <span className={styles.optionName}>{option.name}</span>
                <span className={styles.optionPrice}>{option.price.toFixed(2)} ₺</span>
              </div>
            ))}
          </div>
        )}
        
        <div className={styles.closeButton} onClick={onClose}>
          KAPAT
        </div>
      </div>
    </div>
  );
}

export default ItemDetailView; 