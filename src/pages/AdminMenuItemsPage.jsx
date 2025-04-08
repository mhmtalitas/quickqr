import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // apiClient'i tekrar tanımlamak yerine doğrudan kullanalım

// API İstemcisi (Token ile) - Bu kısım idealde ayrı bir modülde olmalı (örn: src/api.js)
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // FormData için Content-Type'ı otomatik ayarlamasına izin ver
    if (!(config.data instanceof FormData)) {
         config.headers['Content-Type'] = 'application/json';
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

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
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
    formGroup: { marginBottom: '15px' }, // Grid dışındaki elemanlar için
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
    input: { width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' },
    textarea: { width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' },
    select: { width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc', height: '36px' },
    button: { padding: '10px 15px', marginRight: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer' },
    addButton: { backgroundColor: '#28a745', color: 'white' },
    updateButton: { backgroundColor: '#ffc107', color: 'black' },
    cancelButton: { backgroundColor: '#6c757d', color: 'white' },
    deleteButton: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '8px', verticalAlign: 'middle' },
    itemImageThumb: { maxWidth: '60px', maxHeight: '60px', objectFit: 'cover', borderRadius: '4px' },
    imagePreview: { maxWidth: '150px', maxHeight: '150px', marginTop: '10px', display: 'block' },
    error: { color: 'red', marginTop: '10px' },
    loading: { color: '#666' },
};

const initialFormState = {
    name: '',
    description: '',
    price: '',
    category_id: '',
    status: 'available',
    image: null, // Dosya inputu için
};

function AdminMenuItemsPage() {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [formData, setFormData] = useState(initialFormState);
    const [editingItem, setEditingItem] = useState(null); // { id: number, ...data }
    const [imagePreview, setImagePreview] = useState(null); // Seçilen resmin önizlemesi
    const [removeImageFlag, setRemoveImageFlag] = useState(false); // Resmi kaldır flag'i

    // Kategorileri ve Menü Öğelerini Yükle
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [catResponse, itemsResponse] = await Promise.all([
                apiClient.get('/categories'),
                apiClient.get('/menu-items') // Admin tümünü alır (public değil)
            ]);
            setCategories(catResponse.data);
            setMenuItems(itemsResponse.data);
            // Eğer kategori listesi boşsa veya ilk kategori seçili değilse formu ayarla
            if (catResponse.data.length > 0 && !formData.category_id) {
                setFormData(prev => ({ ...prev, category_id: catResponse.data[0].id }));
            }
        } catch (err) {
            console.error("Veri yükleme hatası:", err);
            setError('Sayfa verileri yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, [formData.category_id]); // formData.category_id değiştiğinde de çalıştır (ilk yükleme için)

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Form Değişikliklerini Yönet
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, image: file }));
            // Önizleme oluştur
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setRemoveImageFlag(false); // Yeni dosya seçilince kaldırma flag'ini sıfırla
        } else {
            // Dosya seçimi iptal edilirse
            setFormData(prev => ({ ...prev, image: null }));
            setImagePreview(editingItem?.image_url || null); // Varsa eski resme dön
        }
    };

    // Formu Sıfırla ve Düzenleme Modundan Çık
    const resetForm = () => {
        setFormData(initialFormState);
        setEditingItem(null);
        setImagePreview(null);
        setFormError('');
        setRemoveImageFlag(false);
        // Kategori varsa ilkini seçili yap
        if (categories.length > 0) {
             setFormData(prev => ({ ...prev, category_id: categories[0].id }));
        }
         // Dosya inputunu temizle (önemli!)
        const fileInput = document.getElementById('itemImage');
        if (fileInput) fileInput.value = null;
    };

    // Form Gönderme (Ekleme veya Güncelleme)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError('');

        // FormData oluştur (resim dosyası için gerekli)
        const dataToSend = new FormData();
        dataToSend.append('name', formData.name);
        dataToSend.append('description', formData.description);
        dataToSend.append('price', formData.price);
        dataToSend.append('category_id', formData.category_id);
        dataToSend.append('status', formData.status);
        if (formData.image) {
            dataToSend.append('image', formData.image);
        }
        // Güncelleme sırasında resmi kaldırmak için flag ekle
        if (editingItem && removeImageFlag) {
            dataToSend.append('remove_image', 'true');
        }


        try {
            if (editingItem) {
                // Güncelleme
                await apiClient.put(`/menu-items/${editingItem.id}`, dataToSend);
            } else {
                // Ekleme
                await apiClient.post('/menu-items', dataToSend);
            }
            resetForm();
            await fetchData(); // Listeyi güncelle
        } catch (err) {
            console.error("Form gönderme hatası:", err);
            setFormError(err.response?.data?.message || 'İşlem sırasında bir hata oluştu.');
        } finally {
            setFormLoading(false);
        }
    };

    // Düzenleme Moduna Geçiş
    const handleEditClick = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description || '',
            price: item.price,
            category_id: item.category_id,
            status: item.status,
            image: null, // Başlangıçta dosya seçili değil
        });
        setImagePreview(item.image_url || null); // Mevcut resmin URL'sini önizleme için kullan
        setFormError('');
        setRemoveImageFlag(false);
        window.scrollTo(0, 0); // Sayfanın başına git
    };

    // Silme İşlemi
    const handleDeleteClick = async (id) => {
         if (!window.confirm('Bu menü öğesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
            return;
        }
        // Silme işlemi sırasında formu veya listeyi kilitlemek iyi olabilir
        // setLoading(true); // Genel loading yerine spesifik bir loading state kullanılabilir
        setError('');
         try {
            await apiClient.delete(`/menu-items/${id}`);
            await fetchData(); // Listeyi güncelle
            // Eğer silinen öğe düzenleniyorsa formu sıfırla
            if (editingItem && editingItem.id === id) {
                resetForm();
            }
        } catch (err) {
            console.error("Menü öğesi silme hatası:", err);
            setError(err.response?.data?.message || 'Öğe silinirken bir hata oluştu.');
        } finally {
             // setLoading(false);
        }
    };

    // Resmi Kaldır Butonu
    const handleRemoveImageClick = () => {
        setRemoveImageFlag(true);
        setImagePreview(null); // Önizlemeyi kaldır
        setFormData(prev => ({ ...prev, image: null })); // Seçili dosyayı kaldır
         // Dosya inputunu temizle
        const fileInput = document.getElementById('itemImage');
        if (fileInput) fileInput.value = null;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Menü Öğesi Yönetimi</h1>

            {/* Ekleme/Düzenleme Formu */}
            <div style={styles.formContainer}>
                <h3>{editingItem ? 'Menü Öğesini Düzenle' : 'Yeni Menü Öğesi Ekle'}</h3>
                <form onSubmit={handleSubmit}>
                    <div style={styles.grid}>
                        <div style={styles.formGroup}>
                            <label htmlFor="itemName" style={styles.label}>Öğe Adı:</label>
                            <input type="text" id="itemName" name="name" value={formData.name} onChange={handleInputChange} required style={styles.input} disabled={formLoading} />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="itemCategory" style={styles.label}>Kategori:</label>
                            <select id="itemCategory" name="category_id" value={formData.category_id} onChange={handleInputChange} required style={styles.select} disabled={formLoading || categories.length === 0}>
                                {categories.length === 0 && <option>Önce kategori ekleyin</option>}
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="itemPrice" style={styles.label}>Fiyat (TL):</label>
                            <input type="number" id="itemPrice" name="price" value={formData.price} onChange={handleInputChange} required min="0" step="0.01" style={styles.input} disabled={formLoading} />
                        </div>
                         <div style={styles.formGroup}>
                            <label htmlFor="itemStatus" style={styles.label}>Durum:</label>
                            <select id="itemStatus" name="status" value={formData.status} onChange={handleInputChange} style={styles.select} disabled={formLoading}>
                                <option value="available">Mevcut</option>
                                <option value="unavailable">Mevcut Değil</option>
                            </select>
                        </div>
                    </div>
                     <div style={styles.formGroup}>
                        <label htmlFor="itemDescription" style={styles.label}>Açıklama:</label>
                        <textarea id="itemDescription" name="description" value={formData.description} onChange={handleInputChange} style={styles.textarea} disabled={formLoading}></textarea>
                    </div>
                     <div style={styles.formGroup}>
                        <label htmlFor="itemImage" style={styles.label}>Resim:</label>
                        <input type="file" id="itemImage" name="image" onChange={handleFileChange} accept="image/*" style={styles.input} disabled={formLoading} />
                         {imagePreview && (
                            <div>
                                <img src={imagePreview} alt="Önizleme" style={styles.imagePreview} />
                                {editingItem && <button type="button" onClick={handleRemoveImageClick} style={{...styles.button, ...styles.deleteButton, marginTop: '5px'}} disabled={formLoading}>Resmi Kaldır</button>}
                            </div>
                        )}
                    </div>

                    {formError && <p style={styles.error}>{formError}</p>}

                    <div>
                        {editingItem ? (
                            <>
                                <button type="submit" style={{...styles.button, ...styles.updateButton}} disabled={formLoading}>
                                    {formLoading ? 'Güncelleniyor...' : 'Güncelle'}
                                </button>
                                <button type="button" onClick={resetForm} style={{...styles.button, ...styles.cancelButton}} disabled={formLoading}>
                                    İptal
                                </button>
                            </>
                        ) : (
                            <button type="submit" style={{...styles.button, ...styles.addButton}} disabled={formLoading || categories.length === 0}>
                                {formLoading ? 'Ekleniyor...' : 'Ekle'}
                            </button>
                        )}
                    </div>
                </form>
            </div>

             {/* Menü Öğesi Listesi */}
            <h2>Mevcut Menü Öğeleri</h2>
            {error && <p style={styles.error}>{error}</p>}
            {loading ? <p style={styles.loading}>Yükleniyor...</p> : (
                menuItems.length === 0 ? <p>Henüz menü öğesi eklenmemiş.</p> : (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Resim</th>
                                <th style={styles.th}>Ad</th>
                                <th style={styles.th}>Kategori</th>
                                <th style={styles.th}>Fiyat</th>
                                <th style={styles.th}>Durum</th>
                                <th style={styles.th}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {menuItems.map((item) => (
                                <tr key={item.id}>
                                    <td style={styles.td}>
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} style={styles.itemImageThumb} />
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td style={styles.td}>{item.name}</td>
                                    <td style={styles.td}>{item.category_name}</td>
                                    <td style={styles.td}>{item.price.toFixed(2)} TL</td>
                                    <td style={styles.td}>{item.status === 'available' ? 'Mevcut' : 'Mevcut Değil'}</td>
                                    <td style={styles.td}>
                                        <button
                                            onClick={() => handleEditClick(item)}
                                            style={{...styles.button, ...styles.updateButton, marginRight: '5px', marginBottom: '5px'}}
                                            disabled={loading || formLoading}
                                        >
                                            Düzenle
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(item.id)}
                                            style={{...styles.button, ...styles.deleteButton, marginBottom: '5px'}}
                                            disabled={loading || formLoading}
                                        >
                                            Sil
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            )}
        </div>
    );
}

export default AdminMenuItemsPage;