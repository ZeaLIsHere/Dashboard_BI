# Laporan Teknis & Dokumentasi Business Intelligence (Poin 2 – Poin 7)

**Proyek**: CommercePulse BI — Analisis Profitabilitas, Kebijakan Diskon, Retensi Pelanggan & SLA Logistik E-Commerce (2021–2025)  
**Cakupan**: Poin 2 (*Data Understanding & Preparation*), Poin 3 (*Analytical Findings & Supporting Evidence*), Poin 4 (*Data Visualization & UI/UX Design*), Poin 5 (*Dashboard Functionality & Interactivity*), Poin 6 (*Validation, Limitations & Uncertainty*), dan Poin 7 (*Technical Report & Documentation*).

---

## Ringkasan Eksekutif

Analisis terhadap **138.116 transaksi unik** (2021–2025) dengan nilai *headline net sales* **$177.134.263,74** mengungkap tiga kesenjangan strategis utama yang sebelumnya tersembunyi di balik angka ringkasan bawaan (`dataset_statistics.csv`):

1. **Ilusi Pendapatan & Laba Akuntansi**: Dari total *$177,13M* *headline net sales*, sebesar **$32.938.425,24 (18,60%)** belum terealisasi karena berasal dari pesanan berstatus *Returned* ($13,17M), *Cancelled* ($11,36M), dan *Pending* ($8,41M). Selain itu, kolom `profit` bawaan ($76.146.395,76) masih menyertakan pajak (*tax_amount*). Setelah menyesuaikan pajak dan membatasi hanya pada pesanan *Completed*, **Realized True Operating Profit** tercatat sebesar **$45.998.727,67** (39,59% lebih rendah daripada *headline profit*).
2. **Tebing Diskon (*Discount Cliff*) di Atas 30%**: Korelasi diskon terhadap margin laba sangat kuat dan negatif ($r = -0.707$). Pada item rekonsiliasi bersih 1:1 (*336.313 item*), diskon 0–30% mencatat **0 item rugi**, sedangkan diskon >30% (terutama saat lonjakan promo November–Desember dan di segmen Premium/VIP) memicu kerugian operasional. Simulasi kebijakan pembatasan diskon (*cap*) maksimal 30% menghasilkan tambahan laba operasional bersih **+$3,11M** (bahkan dengan asumsi penurunan volume 10% pada item terdampak) sekaligus menghapus **7.556 item rugi**.
3. **Keterlambatan Pengiriman Menghancurkan Kepuasan Pelanggan**: Pesanan *Delayed* (16.886 pesanan; 14,87% dari pengiriman selesai) menjatuhkan rating rata-rata dari **4,02** (*Early*) dan **3,73** (*On Time*) menjadi **3,22** (Welch's $t = -144.69$, $r = -0.386$), serta menyumbang **80,3% (636 dari 792)** dari seluruh ulasan bersentimen negatif.

---

## Poin 2: Data Understanding & Preparation

### 2.1 Arsitektur & Skema Dataset

Dataset terdiri dari lima berkas CSV dengan struktur relasional *Star/Snowflake*:

| Berkas | Baris | Kolom | Kunci Utama | Peran dalam Model |
|---|---:|---:|---|---|
| `ecommerce_sales_customer_analytics_150k.csv` | 138.116 | 46 | `order_id` | Tabel fakta level order (*order header*) |
| `order_items.csv` | 397.569 | 12 | `order_id` + `product_id` | Tabel fakta level detail item |
| `customer_master.csv` | 25.000 | 11 | `customer_id` | Dimensi profil & CAC pelanggan |
| `product_catalog.csv` | 1.175 | 9 | `product_id` | Dimensi kategori, brand, supplier, harga |
| `dataset_statistics.csv` | 1 | 11 | — | Ringkasan statistik referensi awal |

### 2.2 Temuan Audit Kualitas Data (Data Quality Audit)

1. **Missing Values Bersifat Struktural (Deterministik / MAR), Bukan Acak**:
   - Kolom `delivery_days`, `estimated_delivery_days`, `customer_rating`, `review_sentiment`, dan `customer_review` masing-masing memiliki tepat **24.557** nilai kosong (17,78%).
   - Verifikasi silang membuktikan 24.557 baris tersebut identik 100% dengan gabungan pesanan non-*Completed* (`Returned` 9.462 + `Cancelled` 8.398 + `Pending` 6.697 = 24.557).
   - Kolom `return_status` dan `return_reason` kosong pada 128.654 baris — hanya terisi pada tepat **9.462** pesanan berstatus `Returned`.
   - Kolom `campaign_name` (83.233 kosong) dan `coupon_code` (110.502 kosong) merepresentasikan transaksi tanpa kampanye bernama atau tanpa kupon.
2. **Temuan Kritis — Kolisi 6-Digit `order_id` antara `orders` dan `order_items`**:
   - Meskipun nama file berakhiran `150k`, tabel order hanya memuat **138.116** baris unik karena ruang ID 6 digit (`ORD-100000` s.d. `ORD-999999`) menghasilkan tabrakan ID saat generasi 150.000 transaksi, lalu tabel order dideduplikasi menjadi 138.116 baris unik.
   - Namun, `order_items.csv` masih menyimpan seluruh **397.569** item dari 150.000 transaksi awal. Akibatnya, terdapat **11.226 `order_id` (8,13%)** di mana penjumlahan `order_items.net_sales` ($192.398.877,29) melebihi `orders.net_sales` ($177.134.263,74) sebesar **+$15.264.613,55**.
   - **Mitigasi**: Dibuat flag `is_clean_1to1_order` untuk mengisolasi **126.890 order (336.313 item)** yang cocok 1:1 (`|sum(item.net_sales) - order.net_sales| <= 0.05`) guna menjamin akurasi analisis kategori, brand, dan tier diskon.
3. **Audit Formula Akuntansi (`profit` menyertakan Pajak)**:
   - Di seluruh 138.116 pesanan (`max diff = 2.73e-12`), formula bawaan dataset adalah:
     $$\text{net\_sales} = \text{gross\_sales} - \text{discount\_amount} + \text{tax\_amount} + \text{shipping\_cost}$$
     $$\text{profit}_{\text{dataset}} = \text{net\_sales} - \text{shipping\_cost} - \text{product\_cost}$$
   - Artinya, kolom `profit` bawaan **masih menyertakan `tax_amount`** ($16.914.090,41). Karena pajak penjualan merupakan titipan fiskal (*pass-through*), kami merekayasa fitur **`true_operating_profit`**:
     $$\text{true\_operating\_profit} = \text{net\_sales} - \text{tax\_amount} - \text{shipping\_cost} - \text{product\_cost}$$
4. **Audit Invariansi Mata Uang & Encoding UTF-8**:
   - Pengujian `order_items.unit_price` terhadap `product_catalog.unit_price` membuktikan **100% kecocokan** di seluruh 7 label mata uang (`USD`, `GBP`, `EUR`, `CAD`, `AUD`, `INR`, `AED`). Seluruh nilai moneter sudah berada dalam basis **USD konstan**; konversi kurs tidak boleh dilakukan agar tidak mendistorsi nilai (misalnya menyusutkan transaksi berlabel `INR`).
   - Karakter non-ASCII (seperti `Baden-Württemberg`) wajib dibaca dengan `encoding='utf-8'` untuk mencegah *mojibake* (`Baden-WÃ¼rttemberg`).
5. **Integritas Dimensi Pelanggan & Produk**:
   - Dari 25.000 pelanggan pada `customer_master.csv`, **24.911 pelanggan aktif** bertransaksi dan **89 pelanggan (0,36%)** belum memiliki transaksi. Seluruh 1.175 SKU pada `product_catalog.csv` terhubung tanpa *orphan ID*.

### 2.3 Rekayasa Fitur (Feature Engineering)

Seluruh transformasi diimplementasikan dalam Google Colab (`colab/BI_Analytics_Colab_Poin_2_3_6.ipynb`) dan skrip agregasi Node.js (`scripts/build_dashboard_data.mjs`):
- `is_realized`: boolean `order_status == 'Completed'`
- `true_operating_profit` dan `true_margin_pct`: laba operasional bersih setelah mengeluarkan `tax_amount`
- `discount_pct_order` dan `discount_tier` (`0-10%`, `10-20%`, `20-30%`, `30-40%`, `40-50%`, `50%+`)
- `delivery_delay_days`: `delivery_days - estimated_delivery_days`
- `is_clean_1to1_order`: flag rekonsiliasi 1:1 antara `orders` dan `order_items`
- `age_group`: segmentasi demografi usia (`18-24` s.d. `65+`)

---

## Poin 3: Analytical Findings & Supporting Evidence

### 3.1 Rekonsiliasi Pendapatan & Laba Berdasarkan Status Order

| Status Order | Jumlah Order | Porsi | Net Sales ($) | Dataset Profit ($) | True Operating Profit ($) | Order Rugi (Dataset / True) |
|---|---:|---:|---:|---:|---:|---:|
| **Completed** | 113.559 | 82,22% | $144.195.838,50 | $59.758.469,03 | $45.998.727,67 | 1.229 / 2.397 |
| **Returned** | 9.462 | 6,85% | $13.172.674,79 | $6.925.597,40 | $5.655.924,93 | 0 / 0 |
| **Cancelled** | 8.398 | 6,08% | $11.356.479,77 | $5.974.148,36 | $4.881.905,22 | 0 / 0 |
| **Pending** | 6.697 | 4,85% | $8.409.270,68 | $3.488.180,97 | $2.695.747,53 | 67 / 133 |
| **Total (Headline)** | **138.116** | **100,00%** | **$177.134.263,74** | **$76.146.395,76** | **$59.232.305,35** | **1.296 / 2.530** |

**Implikasi Bisnis**: Angka *headline* melebih-lebihkan pendapatan terealisasi sebesar **$32,94M (18,60%)** dan melebih-lebihkan laba operasional terealisasi sebesar **$30,15M**. Pelaporan eksekutif wajib memisahkan *Realized Revenue* ($144,20M) dari *At-Risk/Unrealized Revenue* ($32,94M).

### 3.2 Tebing Diskon (*Discount Cliff*) & Musim Liburan

Analisis pada **336.313 item bersih (1:1 reconciled)** menunjukkan ambang batas profitabilitas yang sangat tajam:

| Tier Diskon | Jumlah Item | Net Sales ($) | True Operating Profit ($) | True Margin (%) | Dataset Margin (%) | Item Rugi (True / Dataset) | Rasio Rugi (True) |
|---|---:|---:|---:|---:|---:|---:|---:|
| **0–10%** | 140.688 | $70.963.739,99 | $29.197.162,35 | 41,14% | 50,72% | 0 / 0 | 0,00% |
| **10–20%** | 111.986 | $49.248.534,23 | $17.156.213,18 | 34,84% | 44,38% | 0 / 0 | 0,00% |
| **20–30%** | 42.253 | $20.817.812,96 | $5.833.016,07 | 28,02% | 37,55% | 0 / 0 | 0,00% |
| **30–40%** | 19.713 | $11.697.343,61 | $2.232.673,96 | 19,09% | 28,66% | 856 / 140 | 4,34% |
| **40–50%** | 15.405 | $7.824.130,73 | $473.340,65 | 6,05% | 15,56% | 3.384 / 1.631 | 21,97% |
| **50%+** | 6.268 | $2.413.024,79 | **-$397.509,62** | **-16,47%** | **-7,03%** | **3.772 / 2.769** | **60,18%** |

- **Ambang Batas 30%**: Di bawah 30%, tidak ada satu pun item yang mengalami kerugian. Begitu diskon melewati 40%, *true margin* jatuh menjadi 6,05%, dan pada tier **50%+** sebesar **60,18%** item menghasilkan laba operasional negatif.
- **Pola Musiman**: Pada bulan normal (Januari–Juni, Agustus, Oktober), jumlah order rugi nyaris 0. Pada bulan **November–Desember**, volume transaksi melonjak ~50% namun rata-rata diskon meningkat ke ~30%, memicu 124–148 order rugi per bulan.

### 3.3 Kinerja Kategori Produk (Top 5 berdasarkan Net Sales, Clean 1:1)

1. **Electronics**: $34.959.721,12 Net Sales | $8.627.754,65 True Profit (**24,68%** margin — terendah di Top 5) | **1.408** item rugi dataset (6,29%).
2. **Jewelry**: $21.550.795,01 Net Sales | $6.699.723,93 True Profit (**31,09%** margin) | 845 item rugi (4,31%).
3. **Home Appliances**: $21.143.111,57 Net Sales | $6.717.478,74 True Profit (**31,77%** margin) | 870 item rugi (3,88%).
4. **Automotive**: $13.917.819,56 Net Sales | $4.130.484,16 True Profit (**29,68%** margin) | 1.227 item rugi (5,27%).
5. **Sports & Outdoors**: $13.301.358,98 Net Sales | $4.840.672,10 True Profit (**36,39%** margin) | 737 item rugi (2,86%).

### 3.4 Dampak SLA Pengiriman terhadap Rating & Sentimen Pelanggan

Pada 113.559 pesanan *Completed*:
- **Early** (9.757 order; 8,59%): Avg Rating **4,02** | **90,55%** Sentimen Positif (8.835) | Hanya **3** ulasan negatif (0,03%).
- **On Time** (86.916 order; 76,54%): Avg Rating **3,73** | **73,74%** Sentimen Positif (64.089) | **153** ulasan negatif (0,18%).
- **Delayed** (16.886 order; 14,87%): Avg Rating **3,22** | Hanya **30,55%** Sentimen Positif (5.159) | **636** ulasan negatif (**80,30%** dari total 792 ulasan negatif di seluruh perusahaan!).

### 3.5 Ekonomi Pelanggan & Kebocoran Segmen VIP/Premium

- **Consumer** (75.636 order): Avg CAC $42,26 | Avg CLV $9.037,12 (213,8x) | Avg Diskon **15,55%** | Order Rugi **0,30%**.
- **Business** (13.777 order): Avg CAC $42,38 | Avg CLV $8.914,81 (210,4x) | Avg Diskon **15,78%** | Order Rugi **0,33%**.
- **Premium** (34.746 order): Avg CAC $41,94 | Avg CLV $8.878,00 (211,7x) | Avg Diskon **20,23%** | Order Rugi **2,13%** (~7x lipat).
- **VIP** (13.957 order): Avg CAC $41,93 | Avg CLV $8.905,99 (212,4x) | Avg Diskon **20,20%** | Order Rugi **2,03%** (~6,8x lipat).

---

## Poin 4 & Poin 5: Data Visualization, UI/UX Design & Dashboard Interactivity

Aplikasi Web Dashboard dibangun di folder `dashboard/` menggunakan **React 18 + Vite + Recharts + Lucide Icons** dengan prinsip desain **Operate Mode** (*clarity, scanability, tabular-nums, high-contrast light surface*):

### Arsitektur 5 Tampilan Analitis (Poin 4)
1. **Ringkasan Eksekutif**: 4 KPI utama dinamis, bilah peringatan rekonsiliasi otomatis, grafik tren bulanan 2021–2025 (3 mode metrik), pemecahan kebocoran status order, serta grafik batang interaktif per Negara & Kanal Penjualan.
2. **Profitabilitas & Diskon**: Grafik *Discount Cliff* (margin vs rasio rugi per tier), **Simulator What-If Batas Diskon**, dan tabel kinerja 15 kategori produk yang dapat diurutkan.
3. **Pelanggan & SLA Logistik**: Grafik dampak SLA (*Early/On Time/Delayed*) terhadap rating, diagnostik 8 alasan pengembalian (*Return Reasons*), tabel ekonomi segmen (CLV:CAC & kebocoran diskon), dan metode pengiriman.
4. **Validasi & Limitasi**: Tabel audit rekonsiliasi 4 tabel, perbandingan stabilitas *Full 138k vs Clean 1:1 126k*, statistik ketidakpastian (95% CI, Welch's *t*, Pearson *r*), dan katalog 6 limitasi data.
5. **Penjelajah Dimensi**: Tabel pencarian & pengurutan interaktif untuk **Top 30 Brand**, **10 Kanal Marketing**, **19 Gudang**, dan **7 Metode Pembayaran** lengkap dengan tombol **Ekspor CSV**.

### Fitur Interaktivitas Lengkap (Poin 5)
- **Global Cross-Filtering**: Filter dropdown Tahun, Negara, Kanal Penjualan, dan Segmen Pelanggan, plus **klik langsung pada grafik** (Negara, Kanal, SLA Pengiriman, dan Segmen) yang langsung menyaring KPI dan seluruh komponen terkait, dilengkapi *active filter chips* dan tombol *Reset*.
- **Dual Accounting Toggles**: Sakelar instan **Semua Status (Headline) vs Completed Only (Realized)** serta **True Profit (Excl. Tax) vs Dataset Profit (Incl. Tax)** untuk transparansi audit.
- **Interactive What-If Simulator**: Dua slider (*Batas Maksimal Diskon 16%–50%* dan *Asumsi Penurunan Volume 0%–40%*) untuk mengevaluasi skenario kebijakan harga secara *real-time*.
- **CSV Data Export**: Ekspor hasil tabel yang sedang disaring pada tab Kategori dan Penjelajah Dimensi.

---

## Poin 6: Validation, Limitations & Uncertainty

### 6.1 Validasi Stabilitas Sampel (*Clean 1:1* vs *Full Population*)

| Metrik | Populasi Penuh (138.116) | Sampel Bersih 1:1 (126.890) | Selisih Absolut |
|---|---:|---:|---:|
| Completed Rate | 82,22% | 82,19% | 0,03% |
| Return Rate | 6,85% | 6,85% | 0,00% |
| Completed AOV | $1.269,79 | $1.271,09 | $1,30 |
| Headline Margin | 45,07% | 45,07% | 0,00% |
| Customer Rating | 3,68 | 3,68 | 0,00 |

**Kesimpulan**: Menghapus 11.226 order yang terdampak kolisi ID tidak menggeser distribusi metrik bisnis secara material (<0,11%).

### 6.2 Kuantifikasi Ketidakpastian & Uji Hipotesis

- **Completed AOV**: Rata-rata **$1.269,79 ± $6,71** (95% CI; SD = $1.152,81; $n = 113.559$). Tingginya SD mengindikasikan distribusi miring ke kanan (*right-skewed*).
- **Headline Margin %**: **45,07% ± 0,07%** (95% CI; SD = 13,12%).
- **True Operating Margin %**: **35,86% ± 0,07%** (95% CI; SD = 12,95%).
- **Korelasi Diskon vs Margin**: Pearson $r = -0.707$ ($p < 10^{-100}$) — korelasi negatif kuat.
- **Uji Welch's t-test Rating (*Delayed* vs *On Time/Early*)**: $3.22$ vs $3.76$, $t = -144.69$ ($p < 10^{-100}$), dengan korelasi keterlambatan hari $r = -0.386$.
- **Analisis Sensitivitas Pembatasan Diskon 30% (pada 104.240+ order/item Completed 1:1 bersih; baseline True Profit = $42.296.836,92; 7.556 item rugi)**:
  - Penurunan volume 0% (*ceteris paribus*): True Profit **$45.994.805,46** (**+$3.697.968,54**), sisa item rugi = **0**.
  - Penurunan volume 10%: True Profit **$45.406.128,02** (**+$3.109.291,10**), sisa item rugi = **0**.
  - Penurunan volume 20%: True Profit **$44.817.450,57** (**+$2.520.613,65**), sisa item rugi = **0**.

### 6.3 Limitasi Dataset
1. **Kolisi ID 6-digit** pada `order_items.csv` menyebabkan agregasi mentah *order_items* berlebih $15,26M jika tidak direkonsiliasi.
2. **Biaya pemasaran & *reverse logistics* tidak terpotong di `profit`**: Angka laba belum dikurangi biaya akuisisi iklan (`CAC`) maupun ongkos retur barang untuk 9.462 pesanan.
3. **Anomali Retensi 99,76% *Repeat Customer***: Hanya 334 pesanan (0,24%) yang berasal dari pelanggan *New*; dataset mencerminkan kohort pelanggan mapan sehingga tidak cocok memprediksi *churn* pelanggan baru.
4. ***Survivorship Bias* pada Rating**: 24.557 pesanan non-*Completed* tidak memiliki ulasan, sehingga skor rating rata-rata 3,68 hanya mencerminkan transaksi yang selesai dikirim.
5. **Simulasi Elastisitas Bersifat Aproksimatif**: Model *What-If* tidak memiliki data historis perubahan harga kompetitor secara langsung.
6. **Stabilitas Antar-Tahun Terlalu Seragam**: Volume transaksi per tahun konstan di rentang 27.554–27.768 order (2021–2025), menandakan karakteristik dataset sintetis stasioner.

---

## Rekomendasi Strategis

1. **Tetapkan Batas Diskon Keras (*Hard Cap*) 30% dengan Pengecualian Persetujuan**: Segera hentikan diskon >35% terutama di kategori *Electronics* dan *Automotive* selama promo November–Desember serta terapkan batas *margin floor* pada kupon VIP/Premium untuk memulihkan **+$2,5M–$3,7M** laba operasional bersih.
2. **Prioritaskan Pengurangan Keterlambatan Pengiriman (*Delayed SLA*)**: Fokus pada 14,87% pesanan yang terlambat untuk memangkas 80,3% sumber ulasan negatif dan mengangkat kembali rating rata-rata di atas 3,75+.
3. **Standarisasi Definisi KPI Finansial Perusahaan**: Hentikan pelaporan *Headline Revenue* dan *Tax-Inclusive Profit* sebagai metrik utama; ganti dengan **Realized Net Sales** (*Completed only*) dan **True Operating Profit** (*excl. tax*) serta perbaiki generasi `order_id` dari 6 digit menjadi UUID/12-digit guna mencegah tabrakan kunci di gudang data.
