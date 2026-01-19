-- ==========================================
-- DATABASE OPTIMIZATION - IDEOLA TIME KEEPER
-- ==========================================
-- File ini berisi optimasi performa database
-- Termasuk indexes dan constraint untuk meningkatkan kecepatan query
-- Bisa dijalankan kapan saja (tidak mengganggu data yang ada)
-- ==========================================

-- ==========================================
-- 1. INDEXES UNTUK QUERY PERFORMANCE
-- ==========================================

-- Index untuk query logs yang sudah selesai (filtering by end_time)
CREATE INDEX IF NOT EXISTS idx_time_tracker_logs_end_time 
    ON public.time_tracker_logs(end_time)
    WHERE end_time IS NOT NULL;

-- Index komposit untuk filtering berdasarkan user dan waktu
CREATE INDEX IF NOT EXISTS idx_time_tracker_logs_user_end_time 
    ON public.time_tracker_logs(user_name, end_time DESC);

-- Index komposit untuk filtering berdasarkan client dan waktu
CREATE INDEX IF NOT EXISTS idx_time_tracker_logs_client_end_time 
    ON public.time_tracker_logs(client_name, end_time DESC);

-- Index untuk session aktif (where end_time IS NULL)
CREATE INDEX IF NOT EXISTS idx_time_tracker_logs_active 
    ON public.time_tracker_logs(user_name, start_time DESC)
    WHERE end_time IS NULL;

-- Index tambahan untuk optimasi berdasarkan tanggal
CREATE INDEX IF NOT EXISTS idx_time_tracker_logs_date_range
    ON public.time_tracker_logs(start_time, end_time);

-- ==========================================
-- 2. FOREIGN KEY CONSTRAINTS (OPSIONAL)
-- ==========================================
-- Constraint untuk memastikan integritas data
-- Hanya dijalankan jika Anda ingin enforce referential integrity

/*
-- CATATAN PENTING: 
-- Jalankan migration-username.sql TERLEBIH DAHULU jika ada data yang sudah ada
-- untuk memastikan tidak ada data orphaned

-- Tambahkan foreign key constraint
ALTER TABLE public.time_tracker_logs
    ADD CONSTRAINT fk_time_tracker_logs_user_name
    FOREIGN KEY (user_name) REFERENCES public.users(username)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Index untuk foreign key constraint (sudah ada di atas, tapi ini spesifik)
CREATE INDEX IF NOT EXISTS idx_time_tracker_logs_user_name_fk
    ON public.time_tracker_logs(user_name);
*/

-- ==========================================
-- 3. STATISTIK DAN ANALISIS
-- ==========================================
-- Perintah untuk menganalisis tabel dan memperbarui statistik
-- Bantu PostgreSQL optimizer membuat keputusan yang lebih baik

/*
-- Analisis tabel untuk statistik query planning
ANALYZE public.users;
ANALYZE public.clients;
ANALYZE public.project_types;
ANALYZE public.time_tracker_logs;

-- Cek ukuran tabel dan indexes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Cek indexes yang ada
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
*/

-- ==========================================
-- 4. MONITORING QUERY PERFORMANCE
-- ==========================================
-- Query untuk monitoring dan troubleshooting

/*
-- Query yang sering dijalankan dan durasinya
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE userid = (SELECT usesysid FROM pg_user WHERE usename = current_user)
ORDER BY total_time DESC
LIMIT 10;

-- Cek cache hit ratio
SELECT 
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;

-- Cek table bloat (fragmentasi)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/

-- ==========================================
-- 5. MAINTENANCE ROUTINE
-- ==========================================
-- Perintah rutin untuk maintenance database

/*
-- Vacuum tables (membersihkan dead tuples)
VACUUM ANALYZE public.users;
VACUUM ANALYZE public.clients;
VACUUM ANALYZE public.project_types;
VACUUM ANALYZE public.time_tracker_logs;

-- Reindex jika diperlukan (jarang sekali)
-- REINDEX TABLE public.time_tracker_logs;
*/

-- ==========================================
-- OPTIMIZATION COMPLETE
-- ==========================================
-- Database sekarang dioptimalkan untuk performa
-- Monitoring rutin direkomendasikan untuk menjaga kinerja optimal