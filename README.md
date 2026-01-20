# IDEOLA Time Keeper

Aplikasi time tracking internal untuk tim IDEOLA dengan dashboard admin dan client interface.

## 🚀 Quick Start

### Setup Database
1. Buka Supabase Dashboard → SQL Editor
2. Jalankan `DATABASE_SETUP.sql` (setup lengkap) ATAU
3. Jalankan file-file berikut secara berurutan:
   - `DATABASE_CORE.sql` → `DATABASE_SECURITY.sql` → `DATABASE_OPTIMIZATION.sql`

### Setup Aplikasi
```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

### Login Default
- **Admin**: username `admin`, password `admin123`
- Ganti password setelah login pertama!

## 📁 Struktur File Database

### File Utama:
- `DATABASE_SETUP.sql` - Setup lengkap satu file (recommended)
- `DATABASE_CORE.sql` - Schema dasar dan tabel
- `DATABASE_SECURITY.sql` - Kebijakan keamanan
- `DATABASE_OPTIMIZATION.sql` - Indexes dan optimasi

### Panduan:
- `DATABASE_GUIDE.md` - Panduan lengkap setup dan troubleshooting
- `DATABASE_SQL_README.md` - Penjelasan file SQL

## 🛠️ Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI**: Shadcn/ui + Tailwind CSS  
- **Database**: Supabase (PostgreSQL)
- **Auth**: Custom session-based
- **Charts**: Recharts

## 🔧 Fitur Utama

### Admin
- Dashboard statistik real-time
- Manajemen user (admin & client)
- Konfigurasi client & project type
- Monitoring session aktif

### Client  
- Interface time tracking sederhana
- Start/stop timer
- Pilihan client, project type, project name
- Session tracking

## ⚠️ Security Notes
- ✅ Password di-hash dengan bcrypt
- ✅ Role-based access control
- ✅ Row Level Security (RLS) policies
- ⚠️ Wajib deploy dengan HTTPS untuk production
- ⚠️ Ganti password default segera setelah setup

## 📞 Support
Untuk troubleshooting, lihat:
1. `DATABASE_GUIDE.md` - Panduan lengkap
2. Console browser untuk error messages
3. Supabase Dashboard → Logs

---
*Dibuat untuk kebutuhan internal tim IDEOLA*