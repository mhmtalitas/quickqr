import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CategoryCard.module.css';

function CategoryCard({ category, restaurantId }) {
  return (
    <Link 
      to={`/menu/${restaurantId}/category/${category.id}`} 
      className={styles.categoryCard}
    >
      <div className={styles.imageContainer}>
        {category.image_url ? (
          <img 
            src={category.image_url} 
            alt={category.name}
            className={styles.categoryImage}
            onError={(e) => {
              e.target.style.display = 'none';
              const placeholder = e.target.nextElementSibling;
              if (placeholder) {
                placeholder.style.display = 'flex';
              }
            }}
          />
        ) : (
          <div className={styles.imagePlaceholder}>Resim Yok</div>
        )}
      </div>
      <div className={styles.categoryName}>
        {category.name}
      </div>
    </Link>
  );
}

export default CategoryCard; 