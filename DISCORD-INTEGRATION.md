# Discord Integration - Developer Guide

## 📋 Overview

Dokumentasi ini untuk developer yang akan mengintegrasikan Discord bot untuk notifikasi otomatis dari IDEOLA Time Tracker.

---

## 🏗️ Arsitektur Aplikasi

### **Database Structure**

#### 1. **Table: `users`**
```sql
- id (BIGINT) - Primary Key
- username (TEXT) - Unique
- password_hash (TEXT)
- role (TEXT) - 'admin' | 'client'
- full_name (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 2. **Table: `time_tracker_logs`**
```sql
- id (BIGINT) - Primary Key
- user_name (TEXT) - References users.username
- client_name (TEXT) - Client/project owner
- project_type (TEXT) - 'VISUAL IMAGE' | 'CAROUSEL' | 'VIDEO MOTION' | 'GENERAL'
- project_name (TEXT)
- start_time (TIMESTAMPTZ) - When tracking started
- end_time (TIMESTAMPTZ) - When tracking stopped (NULL if still active)
- duration_minutes (FLOAT) - Total duration in minutes (NULL if still active)
```

**PENTING:** `user_name` menyimpan **username** (bukan full_name)
- Example: username = "krisnanda", full_name = "Krisnanda"
- `user_name` di logs = "krisnanda"

---

## 📁 Struktur Folder (Setelah Refactor)

```
src/
├── services/              ← Backend logic untuk Discord integration
│   ├── auth.service.ts
│   ├── user.service.ts
│   └── timetracker.service.ts
├── types/                 ← Type definitions
│   ├── user.types.ts
│   ├── timetracker.types.ts
│   └── index.ts
├── constants/             ← Constants (clients, project types)
│   ├── clients.ts
│   ├── project-types.ts
│   └── index.ts
├── pages/
│   ├── admin/            ← Admin pages
│   ├── client/           ← Client pages (TimeTracker)
│   └── auth/             ← Login page
└── components/
    ├── shared/           ← Shared components
    └── ui/               ← UI components
```

---

## 🔔 Event Points untuk Discord Notifications

### **1. Start Tracking** (User mulai tracking waktu)

**File:** `src/services/timetracker.service.ts`

**Function:** `startTracking()`

```typescript
export const startTracking = async (formData: TimeTrackerFormData) => {
  const { data, error } = await supabase
    .from("time_tracker_logs")
    .insert({
      user_name: formData.user_name,
      client_name: formData.client_name,
      project_type: formData.project_type,
      project_name: formData.project_name,
      start_time: formData.start_time,
    })
    .select()
    .single();

  if (error) throw error;
  
  // 🔔 DISCORD WEBHOOK POINT #1
  // Trigger Discord notification here
  // Data: user_name, client_name, project_type, project_name, start_time
  
  return data as ActiveSession;
};
```

**Notifikasi yang bisa dikirim:**
```
🟢 [START] Krisnanda (@krisnanda) started tracking
📁 Client: GELATO DI LENNO
🎨 Project: VISUAL IMAGE - SUMMER PROMO 2024
⏰ Started at: 14:30 WIB
```

---

### **2. Stop Tracking** (User stop tracking waktu)

**File:** `src/services/timetracker.service.ts`

**Function:** `stopTracking()`

```typescript
export const stopTracking = async (sessionId: number, startTime: string) => {
  const endTime = new Date();
  const start = new Date(startTime);
  const durationMinutes = (endTime.getTime() - start.getTime()) / 60000;

  const { error } = await supabase
    .from("time_tracker_logs")
    .update({
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq("id", sessionId);

  if (error) throw error;
  
  // 🔔 DISCORD WEBHOOK POINT #2
  // Trigger Discord notification here
  // Data: sessionId, start_time, end_time, duration_minutes
  // Fetch full log data if needed: await fetchLogById(sessionId)
};
```

**Notifikasi yang bisa dikirim:**
```
🔴 [STOP] Krisnanda (@krisnanda) stopped tracking
📁 Client: GELATO DI LENNO
🎨 Project: VISUAL IMAGE - SUMMER PROMO 2024
⏱️ Duration: 2 hours 35 minutes
⏰ Finished at: 17:05 WIB
```

---

### **3. Daily Summary** (Opsional - Ringkasan harian)

**Bisa buat function baru di:** `src/services/timetracker.service.ts`

```typescript
export const getDailySummary = async (date: string) => {
  // Query all completed logs for specific date
  const { data, error } = await supabase
    .from("time_tracker_logs")
    .select("*")
    .not("end_time", "is", null)
    .gte("end_time", `${date}T00:00:00`)
    .lte("end_time", `${date}T23:59:59`);
    
  if (error) throw error;
  
  // Process data untuk summary
  return processedData;
};
```

**Notifikasi yang bisa dikirim:**
```
📊 Daily Summary - 2024-01-19

👥 Active Users: 5
⏱️ Total Hours: 38.5 hours

Top Projects:
1. GELATO DI LENNO - 15.2 hours
2. SANSPOWER - 12.8 hours
3. RUMAH KAPAS - 10.5 hours
```

---

## 🔗 Integration Options

### **Option 1: Supabase Database Triggers (Recommended)**

Gunakan **Supabase Database Triggers** untuk mengirim webhook ke Discord.

**Keuntungan:**
- ✅ Tidak perlu modify frontend code
- ✅ Otomatis trigger dari database level
- ✅ Lebih reliable (tidak tergantung client)

**Setup:**
```sql
-- Create function untuk Discord webhook
CREATE OR REPLACE FUNCTION notify_discord_start()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Discord webhook via pg_net atau http extension
  PERFORM net.http_post(
    url := 'https://discord.com/api/webhooks/YOUR_WEBHOOK_URL',
    headers := '{"Content-Type": "application/json"}',
    body := json_build_object(
      'content', 
      '🟢 [START] ' || NEW.user_name || ' started tracking\n' ||
      '📁 Client: ' || NEW.client_name || '\n' ||
      '🎨 Project: ' || NEW.project_type || ' - ' || NEW.project_name
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT
CREATE TRIGGER on_time_tracker_start
  AFTER INSERT ON time_tracker_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_discord_start();
```

---

### **Option 2: Supabase Edge Functions**

Buat **Supabase Edge Function** untuk handle webhook logic.

**Keuntungan:**
- ✅ TypeScript/JavaScript (mudah maintain)
- ✅ Bisa custom logic lebih kompleks
- ✅ Bisa aggregate data sebelum kirim notif

**Setup:**
1. Create Edge Function: `supabase/functions/discord-notify/index.ts`
2. Subscribe to database changes via Supabase Realtime
3. Process & send to Discord webhook

---

### **Option 3: Frontend Integration (Tidak Recommended)**

Modify `startTracking()` dan `stopTracking()` di `timetracker.service.ts`.

**Kelemahan:**
- ❌ Notif tidak terkirim jika user close browser sebelum request selesai
- ❌ Tergantung client-side execution
- ❌ Bisa fail jika network issue

**Hanya gunakan ini jika Option 1 & 2 tidak memungkinkan**

---

## 📊 Data yang Tersedia untuk Discord

### **User Data:**
```typescript
interface User {
  id: number;
  username: string;          // ← Untuk mention
  full_name: string;         // ← Untuk display
  role: "admin" | "client";
  created_at: string;
}
```

### **Time Log Data:**
```typescript
interface TimeLog {
  id: number;
  user_name: string;         // ← Username (bukan full_name!)
  client_name: string;       // ← GELATO DI LENNO, SANSPOWER, dll
  project_type: string;      // ← VISUAL IMAGE, CAROUSEL, dll
  project_name: string;      // ← SUMMER PROMO 2024
  start_time: string;        // ← ISO 8601 format
  end_time: string | null;   // ← NULL jika masih aktif
  duration_minutes: number | null;
}
```

### **Constants:**
```typescript
// File: src/constants/clients.ts
export const CLIENTS = [
  "GELATO DI LENNO",
  "SANSPOWER",
  "RUMAH KAPAS",
  "YASINDO",
  "IDEOLA",
];

// File: src/constants/project-types.ts
export const PROJECT_TYPES = [
  "VISUAL IMAGE",
  "CAROUSEL",
  "VIDEO MOTION",
  "GENERAL",
];
```

---

## 🔐 Environment Variables

**File:** `.env`

```env
# Supabase
VITE_SUPABASE_URL="https://endkmpzjdpaykmccglzu.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Discord (Tambahkan ini)
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
DISCORD_CHANNEL_ID="..." (opsional)
```

---

## 🛠️ Helper Functions yang Bisa Digunakan

### **1. Get User Full Name from Username**

```typescript
import { fetchUserFullNames } from "@/services/user.service";

const userMap = await fetchUserFullNames();
const fullName = userMap.get("krisnanda"); // Returns: "Krisnanda"
```

### **2. Fetch Active Sessions**

```typescript
import { fetchActiveSessions } from "@/services/timetracker.service";

const activeSessions = await fetchActiveSessions();
// Returns array of logs with end_time = null
```

### **3. Fetch Completed Logs**

```typescript
import { fetchCompletedLogs } from "@/services/timetracker.service";

const logs = await fetchCompletedLogs("7days");
// Returns completed logs dari 7 hari terakhir
```

---

## 📝 Example Discord Webhook Payload

```json
{
  "content": null,
  "embeds": [
    {
      "title": "🟢 Tracking Started",
      "description": "Krisnanda started a new tracking session",
      "color": 5763719,
      "fields": [
        {
          "name": "👤 User",
          "value": "Krisnanda (@krisnanda)",
          "inline": true
        },
        {
          "name": "📁 Client",
          "value": "GELATO DI LENNO",
          "inline": true
        },
        {
          "name": "🎨 Project Type",
          "value": "VISUAL IMAGE",
          "inline": true
        },
        {
          "name": "📋 Project Name",
          "value": "SUMMER PROMO 2024",
          "inline": false
        },
        {
          "name": "⏰ Started At",
          "value": "<t:1737284400:F>",
          "inline": true
        }
      ],
      "footer": {
        "text": "IDEOLA Time Tracker"
      },
      "timestamp": "2024-01-19T07:30:00.000Z"
    }
  ]
}
```

---

## ⚠️ Important Notes

### **1. Username vs Full Name**
- Database `time_tracker_logs.user_name` menyimpan **username** (lowercase)
- Untuk mendapatkan full name, harus join dengan table `users`
- Gunakan `fetchUserFullNames()` dari `user.service.ts`

### **2. Timezone**
- Semua `start_time` dan `end_time` disimpan dalam **UTC (ISO 8601)**
- Untuk display di Discord, convert ke WIB (UTC+7)
- Discord timestamp format: `<t:1737284400:F>` (Unix timestamp)

### **3. Active Session**
- Session dianggap aktif jika `end_time = NULL`
- Hanya bisa ada **1 active session per user**
- Check dengan `fetchActiveSessions()` atau `checkActiveSession(username)`

### **4. Duration Calculation**
- Duration dihitung di `stopTracking()`: `(end_time - start_time) / 60000`
- Unit: **minutes** (Float)
- Convert ke human-readable: 
  - 150 minutes → "2 hours 30 minutes"
  - 45 minutes → "45 minutes"

---

## 🔍 Testing Discord Integration

### **1. Test dengan Curl**
```bash
curl -X POST "https://discord.com/api/webhooks/YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "🟢 [TEST] Time tracking started",
    "embeds": [{
      "title": "Test Notification",
      "description": "Testing Discord webhook integration"
    }]
  }'
```

### **2. Test dari Supabase SQL Editor**
```sql
-- Insert test log
INSERT INTO time_tracker_logs (user_name, client_name, project_type, project_name, start_time)
VALUES ('krisnanda', 'IDEOLA', 'GENERAL', 'TEST PROJECT', NOW());

-- Check if trigger fired
SELECT * FROM time_tracker_logs ORDER BY id DESC LIMIT 1;
```

---

## 📚 Resources

- **Supabase Triggers:** https://supabase.com/docs/guides/database/triggers
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Discord Webhooks:** https://discord.com/developers/docs/resources/webhook
- **Discord Embed Builder:** https://discohook.org/

---

## 💡 Recommended Approach

**Untuk developer Discord integration:**

1. ✅ **Gunakan Supabase Database Triggers** (Option 1)
   - Paling reliable dan tidak perlu modify frontend
   - Setup di Supabase SQL Editor
   
2. ✅ **Atau gunakan Supabase Edge Functions** (Option 2)
   - Jika butuh logic lebih kompleks
   - TypeScript-based, mudah maintain

3. ❌ **Hindari Frontend Integration** (Option 3)
   - Hanya sebagai fallback

---

## 🤝 Contact Points

Jika ada pertanyaan tentang struktur data atau butuh akses:

1. **Database Access:** Supabase project credentials di `.env`
2. **API Documentation:** Lihat `src/services/*.ts` untuk semua available functions
3. **Types:** Lihat `src/types/*.ts` untuk type definitions

---

**Good luck dengan Discord integration! 🚀**
