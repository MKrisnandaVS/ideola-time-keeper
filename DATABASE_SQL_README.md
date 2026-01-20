# Panduan File SQL Database

## 📋 File SQL Utama

### 🎯 **DATABASE_SETUP.sql** *(Recommended)*
- **Fungsi**: Setup database lengkap satu file
- **Kapan digunakan**: Setup awal project baru
- **Keuntungan**: Satu langkah, semua komponen

### 🏗️ **Modular Approach** (Alternatif)
1. `DATABASE_CORE.sql` - Schema dasar
2. `DATABASE_SECURITY.sql` - Kebijakan keamanan  
3. `DATABASE_OPTIMIZATION.sql` - Indexes & performa

### 🔄 **migration-username.sql**
- **Fungsi**: Migration data spesifik
- **Kapan digunakan**: Upgrade dari versi lama

## 🚀 Cara Penggunaan

### Opsi 1: Setup Cepat (Disarankan)
```sql
-- Jalankan file DATABASE_SETUP.sql di Supabase SQL Editor
```

### Opsi 2: Setup Modular
1. Jalankan `DATABASE_CORE.sql`
2. Jalankan `DATABASE_SECURITY.sql`
3. Jalankan `DATABASE_OPTIMIZATION.sql` (opsional)

## ⚠️ Catatan Penting
- Backup database sebelum menjalankan script
- Ikuti urutan: CORE → SECURITY → OPTIMIZATION
- Cek hasil dengan query verifikasi di setiap file
- Untuk troubleshooting lengkap, lihat `DATABASE_GUIDE.md`