# KeuanganKu

Aplikasi keuangan sederhana berbasis React + Vite + Tailwind + Supabase.

## Fitur
- Login Google
- Catat pemasukan dan pengeluaran
- Filter transaksi per bulan
- Split bill
- Tagih teman lewat WhatsApp
- Bagian "Saya" otomatis masuk ke pengeluaran

## 1. Install
```bash
npm install
```

## 2. Setup Supabase
Buat project baru di Supabase, lalu:
- aktifkan login Google di menu Authentication
- tambahkan redirect URL:
  - `http://localhost:5173`
  - domain Vercel kamu nanti
- buka SQL Editor, lalu jalankan file `supabase_schema.sql`

## 3. Isi file env
Edit file `.env.local`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyyyyy
```

## 4. Jalankan project
```bash
npm run dev
```

## 5. Deploy ke Vercel
- push project ke GitHub
- import repo ke Vercel
- tambahkan env variable:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- deploy

## Catatan
Di file `App.jsx`, template pesan WhatsApp masih pakai nomor rekening dummy:
- `BCA 1234567890 a/n Nama Kamu`
- `Dana: 081234567890`

Silakan ganti sesuai rekening atau e-wallet kamu.
