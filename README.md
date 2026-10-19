# Mimi Pixel Pet — starter project

Website virtual pet pixel-art yang dirancang untuk HP dan desktop.

## Isi project
- `index.html` — struktur halaman, auth, game, toko, admin studio.
- `style.css` — tampilan pixel-inspired responsif dan animasi Mimi.
- `app.js` — logika game, mode tamu, login, misi, mini-game, aksesori.
- `supabase.sql` — tabel, RLS, storage bucket, dan RPC pembelian/klaim misi.

## Cara menjalankan lokal
Bisa dibuka sebagai file untuk mencoba mode tamu, tetapi untuk auth/Storage gunakan hosting HTTPS (mis. Vercel).

## Setup Supabase
1. Buat project baru di Supabase.
2. Buka SQL Editor dan jalankan isi `supabase.sql`.
3. Buka Project Settings → API, salin Project URL dan anon/public key.
4. Isi dua konstanta di bagian atas `app.js`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   Gunakan anon/public key saja. Jangan pernah masukkan `service_role` key ke browser.
5. Deploy tiga file frontend (`index.html`, `style.css`, `app.js`) ke GitHub lalu impor repository ke Vercel.
6. Buat akun Mimi lewat halaman Daftar. Jika email confirmation aktif, konfirmasi email dahulu.
7. Di Supabase → Authentication → Users, salin UUID akun milikmu.
8. Jalankan query admin berikut di SQL Editor dengan UUID akunmu:
   ```sql
   insert into public.user_roles(user_id, role)
   values ('UUID_DI_SINI'::uuid, 'admin')
   on conflict (user_id) do update set role='admin';
   ```
9. Logout dan login ulang. Tab `Admin studio` akan muncul jika role terbaca.

## Upload aksesori
Admin Studio menerima PNG, WebP, atau JPEG maksimal 3 MB. PNG transparan disarankan. Atur:
- ukuran (%) — lebar gambar relatif ke sprite Mimi;
- posisi kiri (%) — 50 berarti tengah;
- posisi atas (%) — 12 berarti dekat kepala;
- kategori — aksesori kategori sama menggantikan aksesori yang sedang dipakai di kategori itu.

## Penting — status starter
Ini adalah starter awal untuk dikembangkan, bukan game produksi yang sudah diaudit. Untuk keamanan ekonomi penuh, kemajuan statistik, XP, level, dan hadiah mini-game sebaiknya dihitung/divalidasi server-side; starter ini melindungi pembelian aksesori dan klaim misi lewat RPC, tetapi data pet yang disimpan browser masih bisa dimanipulasi oleh pengguna yang memahami developer tools. Jangan gunakan data game untuk uang sungguhan. Top up belum disertakan.
