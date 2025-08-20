# Konfigurasi Kredensial Admin

## Pengenalan

Dokumen ini menjelaskan cara mengonfigurasi kredensial admin untuk aplikasi Sunmi POS v2. Sistem ini sekarang mendukung penggunaan variabel lingkungan untuk menentukan kredensial admin, yang memungkinkan fleksibilitas dan keamanan yang lebih baik.

## Konfigurasi Melalui File .env

Kredensial admin dikonfigurasi melalui file `.env` dengan variabel berikut:

```
# Admin Default Credentials
ADMIN_EMAIL=admin@sunmi.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=System Administrator
```

Variabel-variabel ini digunakan untuk membuat atau memperbarui akun admin saat menjalankan setup database atau saat container Docker dimulai.

## Cara Kerja

1. **Inisialisasi Database**: Saat menjalankan `npm run db:setup`, script `init-admin.js` akan membuat atau memperbarui admin berdasarkan variabel lingkungan di file `.env`.

2. **Container Docker**: Container backend sekarang dikonfigurasi untuk menjalankan script `init-admin.js` saat startup, memastikan kredensial admin selalu sesuai dengan file `.env`.

3. **Frontend**: Halaman login menampilkan kredensial demo yang sesuai dengan variabel lingkungan.

4. **Konfigurasi Proxy**: Frontend dikonfigurasi untuk terhubung ke backend baik dalam lingkungan pengembangan lokal maupun Docker, dengan target proxy yang disesuaikan secara otomatis berdasarkan lingkungan.

## Memperbarui Kredensial Admin

### Untuk Pengembangan Lokal

1. Edit file `.env` dan perbarui variabel `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `ADMIN_NAME`.
2. Jalankan `npm run db:setup` untuk memperbarui database.

### Untuk Deployment Docker

1. Edit file `.env` dan perbarui variabel admin.
2. Gunakan salah satu metode berikut:
   - **Rebuild Container**: Jalankan `npm run docker:rebuild` untuk membangun ulang dan memulai ulang container dengan konfigurasi baru.
   - **Update Tanpa Rebuild**: Jalankan `npm run docker:init-admin` untuk memperbarui admin tanpa membangun ulang container.

## Keamanan

Pastikan untuk mengubah kredensial default sebelum deployment ke lingkungan produksi. Kredensial yang kuat harus:

- Menggunakan password yang kompleks
- Menggunakan alamat email yang valid dan aman
- Diperbarui secara berkala

## Troubleshooting

### Masalah Koneksi Database

1. **Error ECONNREFUSED**: Pastikan PostgreSQL berjalan dan port yang dikonfigurasi di `.env` sesuai dengan port yang diekspos oleh container PostgreSQL (biasanya 5433 pada host).

2. **Error Autentikasi**: Pastikan `DB_USER` dan `DB_PASSWORD` di `.env` sesuai dengan kredensial PostgreSQL yang dikonfigurasi di `docker-compose.yml`.

### Masalah Koneksi Frontend-Backend

1. **Frontend Tidak Dapat Mengakses API**: Pastikan proxy di `vite.config.ts` dikonfigurasi dengan benar. Dalam lingkungan Docker, frontend akan terhubung ke backend menggunakan nama layanan Docker (`backend`) bukan localhost.

2. **Error CORS**: Pastikan `CORS_ORIGIN` di `.env` dikonfigurasi dengan benar untuk mengizinkan permintaan dari frontend.

Jika mengalami masalah dengan kredensial admin:

1. Pastikan file `.env` memiliki variabel admin yang benar.
2. Verifikasi bahwa database berjalan dan dapat diakses.
3. Periksa log container untuk pesan error.
4. Jalankan `npm run docker:init-admin` untuk memaksa pembaruan kredensial admin.