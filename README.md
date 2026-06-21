# 🔷 Pulau Kristal

Game co-op 2 pemain di browser. Kumpulkan kristal, kalahkan slime, lawan boss bersama teman — semua langsung dari HP atau laptop, tanpa install apa-apa.

## Struktur file (sengaja dipisah per fungsi)

```
pulau-kristal/
├── index.html          ← struktur halaman & urutan pemanggilan script
├── css/
│   └── style.css       ← semua tampilan (menu, HUD, kontrol sentuh)
└── js/
    ├── config.js       ← semua angka/konstanta game (kecepatan, HP, warna, dst)
    ├── world.js        ← peta pulau & deteksi tabrakan (collision)
    ├── entities.js     ← pemain, kristal, slime, boss + AI & combat
    ├── quest.js         ← logika 3 tahap quest (kristal → slime → boss)
    ├── render.js        ← semua gambar di canvas (bentuk vektor, ringan)
    ├── input.js          ← kontrol keyboard & joystick sentuh
    ├── network.js        ← koneksi multiplayer peer-to-peer (PeerJS)
    └── main.js            ← penghubung semua modul + game loop
```

Setiap file berdiri sendiri sesuai tugasnya dan saling terhubung lewat objek global `Game` (`Game.Config`, `Game.World`, dst), bukan digabung jadi satu file besar.

## Cara main

1. Satu orang buka game lalu tekan **Buat Room** → akan muncul kode 5 karakter.
2. Orang itu kirim kodenya ke teman (chat, lewat apa saja).
3. Teman buka game di HP/laptop-nya, tekan **Gabung Room**, masukkan kode tadi.
4. Begitu tersambung, kalian langsung masuk ke pulau yang sama.
5. Kontrol: **WASD/arrow** untuk jalan, **Spasi** untuk menyerang (di HP: joystick kiri bawah + tombol pedang kanan bawah).
6. Quest berjalan otomatis bertahap:
   - 💎 Kumpulkan 6 Kristal (cukup dekati, otomatis terambil)
   - 🟢 Kalahkan 4 Slime
   - 👑 Gerbang kuno terbuka → kalahkan Boss bareng-bareng

## Soal multiplayer — tidak perlu server sendiri

Game ini pakai **PeerJS (WebRTC)**: setelah 2 browser saling kenal lewat server gratis milik PeerJS, data permainan mengalir **langsung antar 2 device** (peer-to-peer), bukan lewat servermu. Jadi cukup file statis (HTML/CSS/JS) — pas sekali untuk di-hosting gratis di **GitHub Pages**.

Satu pemain (yang menekan "Buat Room") berperan sebagai *host* yang menyimulasikan seluruh dunia game (posisi, musuh, quest); pemain lain hanya mengirim input dan menampilkan hasilnya. Ini supaya kedua sisi selalu sinkron tanpa baku rebut data.

## Cara upload ke GitHub agar online (GitHub Pages)

1. Buat repository baru di GitHub (bisa lewat web, nama bebas, misal `pulau-kristal`).
2. Upload **seluruh isi folder ini** (index.html, folder css/, folder js/) ke repo tersebut — lewat web GitHub (drag & drop file) atau lewat git:
   ```bash
   cd pulau-kristal
   git init
   git add .
   git commit -m "Pulau Kristal - game co-op pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/pulau-kristal.git
   git push -u origin main
   ```
3. Di GitHub: buka repo → **Settings → Pages**.
4. Di bagian **Build and deployment**, pilih source **Deploy from a branch**, branch `main`, folder `/ (root)` → **Save**.
5. Tunggu 1-2 menit, GitHub akan memberi link seperti:
   `https://USERNAME.github.io/pulau-kristal/`
6. Buka link itu, bagikan ke teman — selesai, sudah online dan bisa dimainkan siapa saja yang punya link.

> Tidak perlu Node.js, build tool, atau server — GitHub Pages cukup menyajikan file apa adanya, dan PeerJS yang menangani koneksi multiplayer-nya.

## Catatan performa (kenapa ringan di HP kelas menengah-bawah)

- Tidak ada gambar (PNG/JPG) yang di-download — semua karakter & objek digambar langsung lewat kode (vector), jadi file sangat kecil dan tidak ada loading gambar.
- Peta digambar **sekali saja** ke kanvas tersembunyi (prerender), lalu tiap frame cuma 1 kali "tempel gambar" — bukan menggambar ratusan kotak setiap frame.
- Hanya 2D Canvas biasa, tidak pakai WebGL/3D yang berat di GPU HP murah.

## Mengubah / menambah hal sendiri

Karena terpisah rapi, kamu bisa ubah satu bagian tanpa takut merusak bagian lain, contoh:
- Mau ubah kecepatan pemain atau HP boss → cukup edit `js/config.js`.
- Mau ubah bentuk peta (tambah pohon, kolam, dll) → edit `js/world.js`.
- Mau tambah quest ke-4 → edit `js/quest.js` dan tambah state baru.
- Mau ubah warna/tampilan tombol → edit `css/style.css`.

Selamat menjelajah Pulau Kristal! 🏝️💎
