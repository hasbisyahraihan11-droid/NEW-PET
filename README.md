# Mimi's Pixel World — Tamagotchi Edition

## Isi
- `index.html` — struktur halaman
- `style.css` — tampilan pixel / retro
- `app.js` — pet care, timer tidur 30 detik, Catch the Star, Memory Match, pixel editor 8×8, shop, local save dan Supabase
- `supabase_setup.sql` — tabel save cloud + Row Level Security

## Jalankan lokal / Vercel
Upload ke repository GitHub yang dipakai Vercel atau letakkan tiga file web (`index.html`, `style.css`, `app.js`) di root project. `supabase_setup.sql` adalah file setup database, bukan halaman web.

## Hubungkan Supabase
1. Buka Supabase project → **Project Settings → API** (atau API Keys).
2. Salin **Project URL** dan **publishable key** / **anon public key**.
3. Buka `app.js`, ganti:
   - `SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co'`
   - `SUPABASE_ANON_KEY = 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'`
4. Di Supabase → **SQL Editor**, jalankan isi `supabase_setup.sql`.
5. Di Supabase → **Authentication → Providers → Email**, pastikan Email provider aktif. Jika konfirmasi email diaktifkan, konfirmasi email sebelum login.
6. Deploy ulang Vercel setelah menyimpan perubahan.

**Penting:** browser app hanya boleh memakai publishable/anon key. Jangan masukkan `service_role` key atau secret key ke `app.js`, HTML, atau GitHub.

## Simpanan
- Tanpa konfigurasi Supabase, game tetap berjalan dan menyimpan progres di `localStorage` pada perangkat/browser yang sama.
- Setelah login Supabase, progres disimpan ke tabel `mimi_saves` dengan kebijakan RLS agar user hanya dapat mengakses save sendiri.
