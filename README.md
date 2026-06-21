# 🔷 Pulau Kristal

Game co-op 2 pemain di browser. Kumpulkan kristal, kalahkan slime, lawan boss bersama teman — semua langsung dari HP atau laptop, tanpa install apa-apa.


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

