import React, { useState } from 'react'; // React'ı import et
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import './App.css'
import LoginPage from './pages/LoginPage'; // Gerçek Login sayfasını import et
import PublicMenuPage from './pages/PublicMenuPage'; // Gerçek Public Menu sayfasını import et
import AdminLayout from './layouts/AdminLayout'; // Gerçek Admin Layout'u import et
import AdminCategoriesPage from './pages/AdminCategoriesPage'; // Gerçek Kategori sayfasını import et
import AdminMenuItemsPage from './pages/AdminMenuItemsPage'; // Gerçek Menü Öğesi sayfasını import et
import AdminQrCodePage from './pages/AdminQrCodePage'; // Gerçek QR Kod sayfasını import et

// --- Yer Tutucu Sayfa Bileşenleri (Daha sonra gerçek bileşenlerle değiştirilecek) ---
// const LoginPage = () => <h2>Admin Giriş Sayfası</h2>; // Kaldırıldı
// const AdminDashboardLayout = () => { // Kaldırıldı
//   // Bu layout admin sayfalarını sarmalayacak (örn: sidebar, header)
//   // Şimdilik sadece Outlet'i render ediyor
//   // TODO: Gerçek admin layout'u oluştur
//   // TODO: Auth kontrolü ekle (ProtectedRoute gibi)
//   console.log("AdminDashboardLayout rendered");
//   return (
//     <div>
//       <h1>Admin Paneli</h1>
//       {/* İç içe geçmiş admin rotaları burada render edilecek */}
//       <Outlet />
//     </div>
//   );
// };
// const AdminCategoriesPage = () => <h3>Kategori Yönetimi</h3>; // Kaldırıldı
// const AdminMenuItemsPage = () => <h3>Menü Öğesi Yönetimi</h3>; // Kaldırıldı
// const AdminQrCodePage = () => <h3>QR Kod Oluştur</h3>; // Kaldırıldı
// const PublicMenuPage = () => <h2>Public Menü Sayfası</h2>; // Kaldırıldı
const NotFoundPage = () => <h2>Sayfa Bulunamadı (404)</h2>;

// --- Korumalı Rota Bileşeni (Basit Örnek) ---
// Gerçek uygulamada token kontrolü ve yönlendirme daha gelişmiş olmalı
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  // TODO: Gerçek token kontrolü ekle (localStorage, context API, vb.)
  const isAuthenticated = !!localStorage.getItem('authToken'); // Basit kontrol

  if (!isAuthenticated) {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    // Yönlendirme sonrası geri dönebilmek için state'e mevcut konumu ekle
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Kullanıcı giriş yapmışsa istenen sayfayı göster
  return children;
};


function App() {
  // TODO: Global state yönetimi (Context API veya Redux/Zustand) eklenebilir
  // Örneğin, kullanıcı bilgisi, tema vb.

  return (
    <div className="App">
      {/* Rotaları Tanımla */}
      <Routes>
        {/* Public Rotalar */}
        <Route path="/" element={<Navigate to="/menu" replace />} /> {/* Ana sayfayı menüye yönlendir */}
        <Route path="/menu/*" element={<PublicMenuPage />} />
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Admin Rotaları (Korumalı) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* AdminDashboardLayout içindeki Outlet'te render edilecekler */}
          <Route index element={<Navigate to="categories" replace />} /> {/* /admin direkt kategorilere yönlendirsin */}
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="menu-items" element={<AdminMenuItemsPage />} />
          <Route path="qrcode" element={<AdminQrCodePage />} />
          {/* Diğer admin sayfaları buraya eklenebilir */}
        </Route>

        {/* Eşleşmeyen Rotalar */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App