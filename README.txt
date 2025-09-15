Sistem Perhitungan SAW (Frontend-only)
Files:
- index.html : Halaman utama aplikasi (UI: Input Data, Kriteria & Bobot, Hasil Perhitungan)
- style.css  : Gaya tampilan dark theme
- script.js  : Logika interaktif, simpan lokal (localStorage), import CSV, export hasil

Cara pakai:
1. Ekstrak folder dan buka index.html di browser (double-click)
2. Tab 'Input Data' untuk menambah/hapus alternatif dan mengisi nilai
3. Tab 'Kriteria & Bobot' untuk mengatur kriteria (nama, tipe, bobot)
4. Klik 'Hitung Hasil' pada tab 'Hasil Perhitungan' untuk melihat ranking
5. Gunakan 'Simpan Lokal' / 'Muat Lokal' untuk menyimpan data pada browser
6. Import CSV: format header -> Alternative, K1, K2,... (opsional baris 2 untuk tipe|bobot: ,benefit|0.3,cost|0.7,...)
