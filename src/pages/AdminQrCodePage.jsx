import React, { useState, useEffect } from 'react';
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
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Basit stiller
const styles = {
    container: { padding: '20px', textAlign: 'center' },
    title: { marginBottom: '30px' },
    qrCodeImage: {
        display: 'block',
        margin: '20px auto',
        maxWidth: '300px', // QR kod boyutunu ayarla
        height: 'auto',
        border: '5px solid #eee', // Kenarlık
        padding: '10px', // İç boşluk
        backgroundColor: 'white',
    },
    infoText: {
        marginTop: '10px',
        color: '#555',
        fontSize: '0.9em',
    },
    error: { color: 'red', marginTop: '20px', fontWeight: 'bold' },
    loading: { color: '#666', fontSize: '1.2em', padding: '30px' },
    printButton: {
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
    }
};

function AdminQrCodePage() {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchQrCode = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await apiClient.get('/qr/generate');
                setQrCodeDataUrl(response.data.qrCodeDataUrl);
            } catch (err) {
                console.error("QR Kod alınırken hata:", err);
                setError('QR Kod yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchQrCode();
    }, []); // Sadece bileşen yüklendiğinde çalışır

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>QR Kod Yazdır</title></head>
                <body style="text-align: center; margin-top: 50px;">
                    <img src="${qrCodeDataUrl}" alt="Menü QR Kodu" style="max-width: 80%; height: auto;"/>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() { window.close(); }
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Menü QR Kodu</h1>

            {loading && <p style={styles.loading}>QR Kod Yükleniyor...</p>}
            {error && <p style={styles.error}>{error}</p>}

            {!loading && !error && qrCodeDataUrl && (
                <div>
                    <p>Müşterilerinizin menüye erişmek için tarayabileceği QR kod aşağıdadır.</p>
                    <img
                        src={qrCodeDataUrl}
                        alt="Menü QR Kodu"
                        style={styles.qrCodeImage}
                    />
                     <p style={styles.infoText}>
                        Bu QR kod, menünüzün public sayfasına yönlendirir.
                        (Hedef URL: {import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000'}/menu)
                    </p>
                    <button onClick={handlePrint} style={styles.printButton}>
                        QR Kodu Yazdır
                    </button>
                </div>
            )}
             {!loading && !error && !qrCodeDataUrl && (
                <p>QR Kod oluşturulamadı.</p>
            )}
        </div>
    );
}

export default AdminQrCodePage;