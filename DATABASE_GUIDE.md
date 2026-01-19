# Panduan Database IDEOLA Time Keeper

## 📋 Daftar Isi
1. [Deskripsi Umum](#deskripsi-umum)
2. [Persiapan Awal Database](#persiapan-awal-database)
3. [Setup Database Lengkap](#setup-database-lengkap)
4. [Troubleshooting](#troubleshooting)
5. [Keamanan Database](#keamanan-database)

## 📝 Deskripsi Umum

File ini berisi panduan lengkap untuk setup dan maintenance database IDEOLA Time Keeper. Panduan ini mencakup:

- Setup awal database dengan tabel dan data default
- Konfigurasi kebijakan keamanan (RLS)
- Penyelesaian masalah umum
- Best practices untuk maintenance

**Kapan digunakan:** Saat pertama kali setup project atau saat mengalami masalah dengan data tidak muncul.

## ⚙️ Persiapan Awal Database

### Masalah Umum yang Sering Terjadi:
1. **Data client/project type tidak muncul** - Biasanya karena kebijakan RLS yang terlalu ketat
2. **Error RLS policy violation** - Kebijakan keamanan memblokir akses
3. **Database terlihat kosong** - Padahal data sudah ada

### Solusi Cepat:
Jika mengalami masalah di atas, ikuti langkah-langkah di bagian [Setup Database Lengkap](#setup-database-lengkap).

## 🔧 Setup Database Lengkap

### Langkah 1: Akses Supabase Dashboard
1. Buka dashboard Supabase Anda
2. Pilih project yang digunakan
3. Buka **SQL Editor**

### Langkah 2: Jalankan Script Setup Database

Salin dan paste script berikut ke SQL Editor:

```sql
-- ==========================================
-- SETUP DATABASE LENGKAP UNTUK IDEOLA TIME KEEPER
-- ==========================================

-- 1. BUAT TABEL CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BUAT TABEL PROJECT TYPES
CREATE TABLE IF NOT EXISTS public.project_types (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AKTIFKAN ROW LEVEL SECURITY
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;

-- 4. BUAT KEBIJAKAN READ ACCESS (PUBLIC)
-- Izinkan semua user membaca data (penting untuk aplikasi berfungsi)
CREATE POLICY "Public read access for clients" ON public.clients
    FOR SELECT 
    USING (true);

CREATE POLICY "Public read access for project types" ON public.project_types
    FOR SELECT 
    USING (true);

-- 5. BUAT KEBIJAKAN WRITE ACCESS (ADMIN ONLY)
-- Hanya admin yang bisa menambah/edit/menghapus data
CREATE POLICY "Admins can manage clients" ON public.clients
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.username = auth.jwt() ->> 'role' 
        AND users.role = 'admin'
    ));

CREATE POLICY "Admins can manage project types" ON public.project_types
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.username = auth.jwt() ->> 'role' 
        AND users.role = 'admin'
    ));

-- 6. TAMBAHKAN DATA DEFAULT
INSERT INTO public.clients (name, description) VALUES 
('GELATO DI LENNO', 'Default client'),
('SANSPOWER', 'Default client'),
('RUMAH KAPAS', 'Default client'),
('YASINDO', 'Default client'),
('IDEOLA', 'Default client')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.project_types (name, description) VALUES 
('VISUAL IMAGE', 'Default project type'),
('CAROUSEL', 'Default project type'),
('VIDEO MOTION', 'Default project type'),
('GENERAL', 'Default project type')
ON CONFLICT (name) DO NOTHING;

-- 7. TAMBAHKAN TRIGGER UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_project_types_updated_at
    BEFORE UPDATE ON public.project_types
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 8. BERIKAN PERMISSION
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.project_types TO authenticated;
GRANT USAGE ON SEQUENCE clients_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE project_types_id_seq TO authenticated;

-- ==========================================
-- VERIFIKASI SETUP
-- ==========================================

-- Cek apakah tabel berhasil dibuat
\dt public.*

-- Cek data default
SELECT 'Clients:' as table_name, COUNT(*) as record_count FROM public.clients
UNION ALL
SELECT 'Project Types:', COUNT(*) FROM public.project_types;

-- Tampilkan sample data
SELECT 'Sample Clients:' as info;
SELECT id, name, description FROM public.clients LIMIT 3;

SELECT 'Sample Project Types:' as info;
SELECT id, name, description FROM public.project_types LIMIT 3;
```

### Langkah 3: Verifikasi Setup
Setelah menjalankan script di atas, cek hasilnya:

```sql
-- Test koneksi dan data
SELECT 
    'Database Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.clients) THEN 'OK - Clients table has data'
        ELSE 'WARNING - No client data found'
    END as status
UNION ALL
SELECT 
    'Project Types',
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.project_types) THEN 'OK - Project types table has data'
        ELSE 'WARNING - No project type data found'
    END;
```

## 🛠️ Troubleshooting

### Masalah: Data Tidak Muncul di Aplikasi
**Gejala:** Pesan "Database tables are empty" meski data sudah ada

**Solusi:**
1. Pastikan script setup sudah dijalankan sepenuhnya
2. Cek apakah kebijakan RLS sudah benar:
```sql
-- Lihat kebijakan yang aktif
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('clients', 'project_types');
```

3. Jika masih bermasalah, jalankan ulang bagian kebijakan:
```sql
-- Drop kebijakan lama
DROP POLICY IF EXISTS "Clients and project types are viewable by authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Clients and project types are viewable by authenticated users" ON public.project_types;

-- Buat kebijakan baru
CREATE POLICY "Public read access for clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public read access for project types" ON public.project_types FOR SELECT USING (true);
```

### Masalah: Error Permission Denied
**Gejala:** Error saat menambah/edit data

**Solusi:**
1. Pastikan Anda login sebagai admin di aplikasi
2. Verifikasi bahwa user admin ada di tabel users dengan role 'admin'

### Masalah: Tabel Tidak Ada
**Gejala:** Error "relation does not exist"

**Solusi:**
Jalankan ulang script setup dari awal, pastikan tidak ada error.

## 🔐 Keamanan Database

### Model Keamanan Saat Ini:
- ✅ **READ (SELECT)**: Publik - Semua user bisa membaca data
- ✅ **WRITE (INSERT/UPDATE/DELETE)**: Admin only - Hanya admin yang bisa mengubah data
- ✅ **Authentication**: Custom session-based (tidak menggunakan Supabase Auth)

### Alasan Pendekatan Ini:
1. **Fleksibilitas**: Cocok dengan sistem autentikasi kustom aplikasi
2. **Keamanan**: Tetap melindungi operasi penulisan data
3. **Fungsionalitas**: Aplikasi bisa membaca data yang diperlukan

### Best Practices:
- 🔒 Jangan pernah membiarkan operasi WRITE terbuka untuk publik
- 🔄 Backup database secara berkala
- 👤 Pastikan hanya user terpercaya yang memiliki akses admin
- 📊 Monitor aktivitas database untuk deteksi anomali

## 📞 Support
Jika mengalami masalah yang tidak tercantum di sini:
1. Cek console browser untuk error messages spesifik
2. Verifikasi koneksi database di file `.env`
3. Pastikan Supabase project berada dalam plan yang sesuai

---
*Dibuat: Januari 2026*  
*Versi Panduan: 1.0*  
*Untuk IDEOLA Time Keeper v1.0*