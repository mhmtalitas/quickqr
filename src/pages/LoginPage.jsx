import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

// Basit stil objeleri (Daha sonra CSS dosyasına taşınabilir)
const styles = {
    container: {
        maxWidth: '400px',
        margin: '50px auto',
        padding: '30px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        backgroundColor: '#fff',
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: '20px',
        textAlign: 'left',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box', // Padding'in genişliği etkilememesi için
    },
    button: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'background-color 0.3s ease',
    },
    buttonHover: { // Stil objesi içinde hover tanımlamak zor, bu yüzden ayrı tutuyoruz
        backgroundColor: '#0056b3',
    },
    error: {
        color: 'red',
        marginTop: '10px',
        minHeight: '20px', // Hata mesajı yokken boşluk bırakmak için
    }
};

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Giriş yapıldıktan sonra yönlendirilecek hedef sayfa
    // Eğer kullanıcı korumalı bir sayfaya erişmeye çalışıp login'e yönlendirildiyse,
    // giriş sonrası o sayfaya geri dönülür. Yoksa varsayılan olarak /admin'e gidilir.
    const from = location.state?.from?.pathname || "/admin";

    const handleLogin = async (e) => {
        e.preventDefault(); // Formun varsayılan submit davranışını engelle
        setError(''); // Önceki hataları temizle
        setLoading(true);

        try {
            // Backend API URL'si (Ortam değişkeninden almak daha iyi olur)
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            const response = await axios.post(`${apiUrl}/auth/login`, {
                username,
                password,
            });

            // Başarılı giriş durumunda token'ı localStorage'a kaydet
            if (response.data.token) {
                localStorage.setItem('authToken', response.data.token);
                console.log('Login successful, navigating to:', from);
                // Kullanıcıyı hedef sayfaya yönlendir
                navigate(from, { replace: true });
            } else {
                setError('Giriş başarısız. Token alınamadı.');
            }

        } catch (err) {
            console.error('Login error:', err);
            if (err.response && err.response.status === 401) {
                setError('Geçersiz kullanıcı adı veya şifre.');
            } else if (err.response) {
                setError(`Bir hata oluştu: ${err.response.data.message || 'Sunucu hatası'}`);
            } else {
                setError('Sunucuya bağlanılamadı. Lütfen ağ bağlantınızı kontrol edin.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2>Admin Girişi</h2>
            <form onSubmit={handleLogin}>
                <div style={styles.formGroup}>
                    <label htmlFor="username" style={styles.label}>Kullanıcı Adı:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="password" style={styles.label}>Şifre:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading}
                    />
                </div>
                {error && <p style={styles.error}>{error}</p>}
                <button
                    type="submit"
                    style={styles.button}
                    disabled={loading}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.buttonHover.backgroundColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = styles.button.backgroundColor}
                >
                    {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                </button>
            </form>
        </div>
    );
}

export default LoginPage;