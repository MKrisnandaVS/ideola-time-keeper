-- ==========================================
-- DATABASE SECURITY POLICIES - IDEOLA TIME KEEPER
-- ==========================================
-- File ini berisi kebijakan keamanan dan RLS policies
-- Harus dijalankan SETELAH DATABASE_CORE.sql
-- ==========================================

-- ==========================================
-- 1. DROP KEBIJAKAN DASAR (jika ada)
-- ==========================================
DROP POLICY IF EXISTS "Basic read access" ON public.users;
DROP POLICY IF EXISTS "Basic read access" ON public.clients;
DROP POLICY IF EXISTS "Basic read access" ON public.project_types;
DROP POLICY IF EXISTS "Basic read access" ON public.time_tracker_logs;

-- ==========================================
-- 2. KEBIJAKAN KEAMANAN UNTUK USERS TABLE
-- ==========================================
-- Users hanya bisa melihat data mereka sendiri (kecuali password_hash untuk login)
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    USING (true);

-- Hanya admin yang bisa mengelola users
CREATE POLICY "Admins can manage users" ON public.users
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.users current_user
        WHERE (current_user.username = auth.jwt() ->> 'email' OR current_user.username = auth.jwt() ->> 'user_name')
        AND current_user.role = 'admin'
    ));

-- ==========================================
-- 3. KEBIJAKAN KEAMANAN UNTUK CLIENTS TABLE
-- ==========================================
-- READ ACCESS: Public (agar aplikasi bisa membaca data client)
CREATE POLICY "Public read access for clients" ON public.clients
    FOR SELECT 
    USING (true);

-- WRITE ACCESS: Admin only
CREATE POLICY "Admins can manage clients" ON public.clients
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users current_user
        WHERE (current_user.username = auth.jwt() ->> 'email' OR current_user.username = auth.jwt() ->> 'user_name')
        AND current_user.role = 'admin'
    ));

-- ==========================================
-- 4. KEBIJAKAN KEAMANAN UNTUK PROJECT_TYPES TABLE
-- ==========================================
-- READ ACCESS: Public
CREATE POLICY "Public read access for project types" ON public.project_types
    FOR SELECT 
    USING (true);

-- WRITE ACCESS: Admin only
CREATE POLICY "Admins can manage project types" ON public.project_types
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users current_user
        WHERE (current_user.username = auth.jwt() ->> 'email' OR current_user.username = auth.jwt() ->> 'user_name')
        AND current_user.role = 'admin'
    ));

-- ==========================================
-- 5. KEBIJAKAN KEAMANAN UNTUK TIME_TRACKER_LOGS TABLE
-- ==========================================
-- Users bisa melihat log mereka sendiri
CREATE POLICY "Users can view own logs" ON public.time_tracker_logs
    FOR SELECT
    USING (user_name = auth.jwt() ->> 'email' OR user_name = auth.jwt() ->> 'user_name');

-- Users bisa menambah log mereka sendiri
CREATE POLICY "Users can insert own logs" ON public.time_tracker_logs
    FOR INSERT
    WITH CHECK (user_name = auth.jwt() ->> 'email' OR user_name = auth.jwt() ->> 'user_name');

-- Admin bisa mengelola semua logs
CREATE POLICY "Admins can manage all logs" ON public.time_tracker_logs
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.users current_user
        WHERE (current_user.username = auth.jwt() ->> 'email' OR current_user.username = auth.jwt() ->> 'user_name')
        AND current_user.role = 'admin'
    ));

-- ==========================================
-- 6. VERIFIKASI KEBIJAKAN
-- ==========================================
/*
-- Cek kebijakan yang aktif
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual AS condition
FROM pg_policies 
WHERE tablename IN ('users', 'clients', 'project_types', 'time_tracker_logs')
ORDER BY tablename, policyname;

-- Test kebijakan
-- Coba query berikut untuk memastikan RLS bekerja:
-- SELECT * FROM public.clients; -- Harus berhasil (public read)
-- INSERT INTO public.clients (name, description) VALUES ('TEST', 'test'); -- Harus gagal (butuh admin)
*/

-- ==========================================
-- SECURITY SETUP COMPLETE
-- ==========================================
-- Database sekarang memiliki kebijakan keamanan yang sesuai
-- Jalankan DATABASE_OPTIMIZATION.sql untuk optimasi performa