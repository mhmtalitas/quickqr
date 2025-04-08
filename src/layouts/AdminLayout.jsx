import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';

// Basit stiller (CSS dosyasına taşınabilir)
const styles = {
    layout: {
        display: 'flex',
        minHeight: '100vh', // Tüm ekran yüksekliğini kapla
    },
    sidebar: {
        width: '220px',
        backgroundColor: '#343a40', // Koyu sidebar
        color: 'white',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
    },
    sidebarLink: {
        color: 'white',
        textDecoration: 'none',
        padding: '10px 0',
        marginBottom: '10px',
        fontSize: '1.1em',
        borderBottom: '1px solid #495057', // Linkler arası ayırıcı
        transition: 'background-color 0.2s ease',
    },
    sidebarLinkHover: { // Stil objesi içinde hover zor, inline kullanılacak
        backgroundColor: '#495057',
    },
    logoutButton: {
        marginTop: 'auto', // Butonu en alta it
        padding: '10px',
        backgroundColor: '#dc3545', // Kırmızı renk
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        textAlign: 'center',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    logoutButtonHover: {
        backgroundColor: '#c82333',
    },
    content: {
        flexGrow: 1, // Kalan alanı kapla
        padding: '30px',
        backgroundColor: '#f8f9fa', // Açık gri içerik alanı
    },
    activeLink: { // Aktif link stili (NavLink ile daha kolay yapılabilir)
        fontWeight: 'bold',
        backgroundColor: '#495057',
    }
};

function AdminLayout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('authToken'); // Token'ı sil
        navigate('/admin/login'); // Login sayfasına yönlendir
    };

    // Aktif link stilini uygulamak için basit bir yol (NavLink daha iyi)
    const getLinkStyle = (path) => {
        return window.location.pathname.startsWith(`/admin${path}`)
               ? {...styles.sidebarLink, ...styles.activeLink}
               : styles.sidebarLink;
    };

    return (
        <div style={styles.layout}>
            <nav style={styles.sidebar}>
                <h2>Admin Paneli</h2>
                <Link
                    to="/admin/categories"
                    style={getLinkStyle('/categories')}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.sidebarLinkHover.backgroundColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = getLinkStyle('/categories').backgroundColor || 'transparent'} // Hover sonrası eski stile dön
                >
                    Kategoriler
                </Link>
                <Link
                    to="/admin/menu-items"
                    style={getLinkStyle('/menu-items')}
                     onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.sidebarLinkHover.backgroundColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = getLinkStyle('/menu-items').backgroundColor || 'transparent'}
                >
                    Menü Öğeleri
                </Link>
                <Link
                    to="/admin/qrcode"
                    style={getLinkStyle('/qrcode')}
                     onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.sidebarLinkHover.backgroundColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = getLinkStyle('/qrcode').backgroundColor || 'transparent'}
                >
                    QR Kod
                </Link>
                {/* Diğer admin linkleri buraya eklenebilir */}

                <button
                    onClick={handleLogout}
                    style={styles.logoutButton}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = styles.logoutButtonHover.backgroundColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = styles.logoutButton.backgroundColor}
                >
                    Çıkış Yap
                </button>
            </nav>
            <main style={styles.content}>
                {/* İç içe geçmiş admin rotaları (AdminCategoriesPage vb.) burada render edilecek */}
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;