# Mimi Virtual Pet ♡

## Isi proyek
- `index.html` — halaman game
- `style.css` — desain responsif
- `app.js` — pet, kebutuhan, species, custom studio, shop, mini-games, local save, optional Supabase auth/profile sync
- `supabase_setup.sql` — schema and RLS setup

## Cara pasang ke GitHub + Vercel
1. Download ZIP ini lalu ekstrak.
2. Buka repo GitHub `NEW-PET`.
3. Upload/ganti `index.html`, `style.css`, `app.js` di root repo. Upload `supabase_setup.sql` juga sebagai dokumentasi.
4. Commit perubahan; Vercel biasanya deploy otomatis.
5. Buka website Vercel dan refresh.

## Cara kerja
- Game langsung bisa dimainkan tanpa login. Progres disimpan di browser/perangkat yang sama.
- Tombol **Akun** membuka login Supabase. Profile sync memakai tabel `robot_profiles`.
- Jika tabel `robot_profiles` yang ada belum punya kolom `pet_state`, jalankan SQL yang sesuai atau tambahkan kolom `pet_state jsonb not null default '{}'::jsonb`.
- Jalankan `supabase_setup.sql` di Supabase SQL Editor bila ingin membuat/menyiapkan tabel dan policy.
- Gunakan hanya publishable/anon key di frontend. Jangan pernah menaruh `service_role` key di file website.

## Catatan penting
Mini-game rewards, koin, inventori, dan pembelian di versi ini masih dikelola di browser untuk prototipe. Jangan menganggap saldo/koin anti-cheat. Untuk versi publik yang benar-benar aman, pembelian/reward perlu dipindahkan ke fungsi database (RPC) dengan validasi server-side.
