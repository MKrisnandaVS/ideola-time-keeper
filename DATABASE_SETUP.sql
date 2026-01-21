-- ==========================================
-- DATABASE SETUP SCRIPT - IDEOLA TIME KEEPER
-- ==========================================
-- File ini berisi semua perintah database yang diperlukan
-- Jalankan file ini SATU KALI saat setup awal project
-- ==========================================

-- ==========================================
-- 1. SETUP USER AUTHENTICATION TABLE
-- ==========================================
-- Tabel untuk sistem autentikasi kustom
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Insert default admin user
-- Password: admin123 (hashed)
INSERT INTO public.users (username, password_hash, role, full_name)
VALUES ('admin', '$2b$10$pqBFml8OQLWVL1ijW7C.FOiZLSVXCZAhC3cwmjQU8/nGbdoF/IFYy', 'admin', 'Administrator')
ON CONFLICT (username) DO NOTHING;

-- ==========================================
-- 2. SETUP CLIENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.clients (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default clients
INSERT INTO public.clients (name, description) VALUES 
('GELATO DI LENNO', 'Default client'),
('SANSPOWER', 'Default client'),
('RUMAH KAPAS', 'Default client'),
('YASINDO', 'Default client'),
('IDEOLA', 'Default client')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 3. SETUP PROJECT TYPES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.project_types (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default project types
INSERT INTO public.project_types (name, description) VALUES 
('VISUAL IMAGE', 'Default project type'),
('CAROUSEL', 'Default project type'),
('VIDEO MOTION', 'Default project type'),
('GENERAL', 'Default project type')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 4. SETUP TIME TRACKER LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.time_tracker_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    project_type TEXT NOT NULL,
    project_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_logs_user_name ON public.time_tracker_logs(user_name);
CREATE INDEX IF NOT EXISTS idx_logs_client_name ON public.time_tracker_logs(client_name);
CREATE INDEX IF NOT EXISTS idx_logs_end_time ON public.time_tracker_logs(end_time);
CREATE INDEX IF NOT EXISTS idx_logs_start_time ON public.time_tracker_logs(start_time);

-- ==========================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracker_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 6. CREATE SECURITY POLICIES
-- ==========================================

-- USERS table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage users" ON public.users
    FOR ALL
    USING (true);

-- CLIENTS table policies
-- READ ACCESS: Public (penting agar aplikasi bisa membaca data)
CREATE POLICY "Public read access for clients" ON public.clients
    FOR SELECT 
    USING (true);

-- WRITE ACCESS: Admin only
CREATE POLICY "Admins can manage clients" ON public.clients
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.username = auth.jwt() ->> 'role' 
        AND users.role = 'admin'
    ));

-- PROJECT_TYPES table policies
-- READ ACCESS: Public
CREATE POLICY "Public read access for project types" ON public.project_types
    FOR SELECT 
    USING (true);

-- WRITE ACCESS: Admin only
CREATE POLICY "Admins can manage project types" ON public.project_types
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.username = auth.jwt() ->> 'role' 
        AND users.role = 'admin'
    ));

-- TIME_TRACKER_LOGS table policies
CREATE POLICY "Users can view own logs" ON public.time_tracker_logs
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own logs" ON public.time_tracker_logs
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can manage all logs" ON public.time_tracker_logs
    FOR ALL
    USING (true);

-- ==========================================
-- 7. CREATE UTILITY FUNCTIONS
-- ==========================================
-- Function untuk auto-update timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk semua tabel
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_project_types_updated_at
    BEFORE UPDATE ON public.project_types
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_logs_updated_at
    BEFORE UPDATE ON public.time_tracker_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- 8. GRANT PERMISSIONS
-- ==========================================
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.project_types TO authenticated;
GRANT ALL ON public.time_tracker_logs TO authenticated;

GRANT USAGE ON SEQUENCE users_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE clients_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE project_types_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE time_tracker_logs_id_seq TO authenticated;

-- ==========================================
-- 9. VERIFICATION QUERIES
-- ==========================================
-- Jalankan query berikut untuk memverifikasi setup berhasil:

/*
-- Cek semua tabel yang dibuat
\dt public.*

-- Cek jumlah data di setiap tabel
SELECT 'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Clients', COUNT(*) FROM public.clients
UNION ALL
SELECT 'Project Types', COUNT(*) FROM public.project_types
UNION ALL
SELECT 'Time Logs', COUNT(*) FROM public.time_tracker_logs;

-- Cek sample data
SELECT 'Sample Clients:' as info;
SELECT id, name, description FROM public.clients;

SELECT 'Sample Project Types:' as info;  
SELECT id, name, description FROM public.project_types;

SELECT 'Admin User:' as info;
SELECT username, role, full_name FROM public.users WHERE role = 'admin';

-- Cek kebijakan RLS
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('users', 'clients', 'project_types', 'time_tracker_logs')
ORDER BY tablename, policyname;
*/

-- ==========================================
-- SETUP COMPLETE
-- ==========================================
-- Jika semua query di atas berhasil tanpa error,
-- maka setup database telah selesai dengan benar.
-- Selanjutnya restart aplikasi dan coba akses halaman admin.