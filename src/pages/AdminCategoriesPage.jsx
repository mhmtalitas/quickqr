import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// API İstemcisi (Token ile)
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 10000 // 10 saniye zaman aşımı
});

// API İstemci konfigürasyonu
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // FormData için Content-Type header'ını siliyoruz, browser'ın kendisi ayarlasın
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    } else {
        config.headers['Content-Type'] = 'application/json';
    }
    
    console.log('API isteği gönderiliyor:', {
        url: config.baseURL + config.url,
        method: config.method?.toUpperCase(),
        data: config.data instanceof FormData ? 'FormData' : config.data,
    });
    
    return config;
}, (error) => {
    console.error('API istek hatası:', error);
    return Promise.reject(error);
});

// API yanıtlarını ve hataları izleme
apiClient.interceptors.response.use(
    (response) => {
        console.log('API başarılı yanıt:', {
            status: response.status,
            statusText: response.statusText,
            url: response.config.url,
            data: response.data,
        });
        return response;
    },
    (error) => {
        console.error('API hata yanıtı:', {
            message: error.message,
            url: error.config?.url,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            responseData: error.response?.data,
        });
        return Promise.reject(error);
    }
);

// Basit stiller
const styles = {
    container: { padding: '20px' },
    title: { marginBottom: '20px' },
    formContainer: {
        marginBottom: '30px',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    inputGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
    input: { width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' },
    imagePreview: { 
        width: '100%', 
        maxWidth: '300px', 
        height: '150px', 
        marginTop: '10px', 
        border: '1px solid #ddd',
        borderRadius: '4px',
        objectFit: 'cover',
        display: 'block'
    },
    button: { padding: '10px 15px', marginRight: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer' },
    addButton: { backgroundColor: '#28a745', color: 'white' },
    updateButton: { backgroundColor: '#ffc107', color: 'black' },
    cancelButton: { backgroundColor: '#6c757d', color: 'white' },
    deleteButton: { backgroundColor: '#dc3545', color: 'white' },
    list: { listStyle: 'none', padding: 0 },
    listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' },
    listItemName: { flexGrow: 1, marginRight: '10px' },
    error: { color: 'red', marginTop: '10px' },
    loading: { color: '#666' },
    categoryThumb: {
        width: '50px',
        height: '50px',
        borderRadius: '4px',
        marginRight: '10px',
        objectFit: 'cover'
    },
    categoryInfo: {
        display: 'flex',
        alignItems: 'center',
        flexGrow: 1
    }
};

function AdminCategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryImage, setCategoryImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [editingCategory, setEditingCategory] = useState(null); // { id: number, name: string }
    const fileInputRef = useRef(null);

    // Kategorileri Yükle
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/categories');
            setCategories(response.data);
        } catch (err) {
            console.error("Kategori yükleme hatası:", err);
            setError('Kategoriler yüklenirken bir hata oluştu.');
            // Token hatası varsa login'e yönlendirme yapılabilir (ProtectedRoute zaten yapıyor olmalı)
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Görsel Seçimi İşlemi
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCategoryImage(file);
            // Görsel önizleme için URL oluştur
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    // Yeni Kategori Ekleme
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setLoading(true);
        setError('');
        
        try {
            console.log('Kategori ekleme isteği başlatılıyor...');
            console.log('Form verileri:', {
                name: newCategoryName,
                imageSelected: categoryImage ? true : false,
                imageName: categoryImage ? categoryImage.name : null,
                imageSize: categoryImage ? categoryImage.size : null,
                imageType: categoryImage ? categoryImage.type : null
            });
            
            // FormData nesnesi oluştur
            const formData = new FormData();
            formData.append('name', newCategoryName);
            formData.append('description', '');
            
            if (categoryImage) {
                console.log('Görsel ekleniyor:', categoryImage.name);
                formData.append('image', categoryImage);
            } else {
                console.log('Görsel eklenmedi');
            }
            
            // FormData içeriğini kontrol et
            for (let [key, value] of formData.entries()) {
                console.log(`FormData: ${key} = ${typeof value === 'object' ? 'Dosya Nesnesi' : value}`);
            }

            console.log('API isteği yapılıyor...');
            const response = await apiClient.post('/categories', formData);
            
            console.log('API yanıtı başarılı:', response.data);
            
            // Başarılı olduğunda formu temizle
            setNewCategoryName('');
            setCategoryImage(null);
            setImagePreview('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            // Kategori listesini güncelle
            await fetchCategories();
        } catch (err) {
            console.error("Kategori ekleme hatası:", err);
            
            if (err.response) {
                console.log('API yanıt hatası detayları:', {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data,
                    headers: err.response.headers
                });
                setError(err.response?.data?.message || 'Kategori eklenirken bir hata oluştu.');
            } else if (err.request) {
                console.log('API yanıt vermedi:', err.request);
                setError('Sunucudan yanıt alınamadı, lütfen internet bağlantınızı kontrol edin.');
            } else {
                console.log('İstek oluşturma hatası:', err.message);
                setError('İstek oluşturulurken bir hata oluştu: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Kategori Silme
    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve kategoriye ait tüm menü öğeleri de silinir!')) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiClient.delete(`/categories/${id}`);
            // setCategories(categories.filter(cat => cat.id !== id)); // Optimistic UI yerine yeniden fetch
            await fetchCategories(); // Listeyi güncelle
        } catch (err) {
            console.error("Kategori silme hatası:", err);
            setError(err.response?.data?.message || 'Kategori silinirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Düzenleme Moduna Geçiş
    const handleEditClick = (category) => {
        setEditingCategory(category);
        setNewCategoryName(category.name); // Formu doldur
        setImagePreview(category.image_url || '');
    };

    // Düzenlemeyi İptal Et
    const handleCancelEdit = () => {
        setEditingCategory(null);
        setNewCategoryName('');
        setCategoryImage(null);
        setImagePreview('');
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Kategori Güncelleme
    const handleUpdateCategory = async (e) => {
        e.preventDefault();
        if (!editingCategory || !newCategoryName.trim()) return;
        setLoading(true);
        setError('');
        
        try {
            console.log('Kategori güncelleme isteği yapılıyor...');
            console.log('Güncellenecek kategori:', editingCategory);
            
            // FormData nesnesi oluştur
            const formData = new FormData();
            formData.append('name', newCategoryName);
            formData.append('description', ''); // Boş da olsa description ekle
            
            if (categoryImage) {
                console.log('Yeni görsel ekleniyor:', categoryImage.name);
                formData.append('image', categoryImage);
            } else {
                console.log('Yeni görsel eklenmedi, mevcut görsel kullanılacak');
            }
            
            // FormData içeriğini kontrol et
            for (let [key, value] of formData.entries()) {
                console.log(key, ':', typeof value === 'object' ? 'File Object' : value);
            }
            
            const url = `/categories/${editingCategory.id}`;
            console.log('İstek URL:', url);
            
            const response = await apiClient.put(url, formData);
            
            console.log('Güncelleme yanıtı:', response.data);
            
            setEditingCategory(null);
            setNewCategoryName('');
            setCategoryImage(null);
            setImagePreview('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            await fetchCategories(); // Listeyi güncelle
        } catch (err) {
            console.error("Kategori güncelleme hatası:", err);
            
            if (err.response) {
                console.log('Hata detayları:', {
                    status: err.response.status,
                    data: err.response.data
                });
                setError(err.response?.data?.message || 'Kategori güncellenirken bir hata oluştu.');
            } else if (err.request) {
                console.log('Yanıt alınamadı:', err.request);
                setError('Sunucudan yanıt alınamadı, lütfen internet bağlantınızı kontrol edin.');
            } else {
                console.log('İstek oluşturma hatası:', err.message);
                setError('İstek oluşturulurken bir hata oluştu.');
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Kategori Yönetimi</h1>

            {/* Ekleme/Düzenleme Formu */}
            <div style={styles.formContainer}>
                <h3>{editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}</h3>
                <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}>
                    <div style={styles.inputGroup}>
                        <label htmlFor="categoryName" style={styles.label}>Kategori Adı:</label>
                        <input
                            type="text"
                            id="categoryName"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            required
                            style={styles.input}
                            disabled={loading}
                        />
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label htmlFor="categoryImage" style={styles.label}>Kategori Görseli:</label>
                        <input
                            type="file"
                            id="categoryImage"
                            onChange={handleImageChange}
                            accept="image/*"
                            style={styles.input}
                            disabled={loading}
                            ref={fileInputRef}
                        />
                        {imagePreview && (
                            <img 
                                src={imagePreview} 
                                alt="Kategori önizleme" 
                                style={styles.imagePreview} 
                            />
                        )}
                    </div>
                    
                    {error && <p style={styles.error}>{error}</p>}
                    <div>
                        {editingCategory ? (
                            <>
                                <button type="submit" style={{...styles.button, ...styles.updateButton}} disabled={loading}>
                                    {loading ? 'Güncelleniyor...' : 'Güncelle'}
                                </button>
                                <button type="button" onClick={handleCancelEdit} style={{...styles.button, ...styles.cancelButton}} disabled={loading}>
                                    İptal
                                </button>
                            </>
                        ) : (
                            <button type="submit" style={{...styles.button, ...styles.addButton}} disabled={loading}>
                                {loading ? 'Ekleniyor...' : 'Ekle'}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Kategori Listesi */}
            <h2>Mevcut Kategoriler</h2>
            {loading && !categories.length ? <p style={styles.loading}>Yükleniyor...</p> : null}
            {!loading && !categories.length && !error ? <p>Henüz kategori eklenmemiş.</p> : null}
            {categories.length > 0 && (
                <ul style={styles.list}>
                    {categories.map((category) => (
                        <li key={category.id} style={styles.listItem}>
                            <div style={styles.categoryInfo}>
                                {category.image_url && (
                                    <img 
                                        src={category.image_url} 
                                        alt={category.name} 
                                        style={styles.categoryThumb}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                )}
                                <span style={styles.listItemName}>{category.name}</span>
                            </div>
                            <div>
                                <button
                                    onClick={() => handleEditClick(category)}
                                    style={{...styles.button, ...styles.updateButton, marginRight: '5px'}}
                                    disabled={loading || !!editingCategory} // Düzenleme modundayken diğerlerini disable et
                                >
                                    Düzenle
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    style={{...styles.button, ...styles.deleteButton}}
                                    disabled={loading || !!editingCategory}
                                >
                                    Sil
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default AdminCategoriesPage;