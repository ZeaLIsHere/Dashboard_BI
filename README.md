# Kelompok BI — E-Commerce Analytics & Interactive Dashboard (Poin 2 – Poin 7)

Repositori ini berisi seluruh artefak pengerjaan tugas Business Intelligence untuk poin **2 hingga 7**:

1. **Google Colab Notebook (Poin 2, 3, & 6)**  
   - File: `colab/BI_Analytics_Colab_Poin_2_3_6.ipynb`
   - Cara pakai:
     1. Upload 5 file CSV (`ecommerce_sales_customer_analytics_150k.csv`, `order_items.csv`, `customer_master.csv`, `product_catalog.csv`, `dataset_statistics.csv`) ke Google Drive folder `MyDrive/Kelompok_BI/` (atau upload langsung ke sesi Colab).
     2. Buka `colab/BI_Analytics_Colab_Poin_2_3_6.ipynb` di [Google Colab](https://colab.research.google.com/) dan jalankan **Runtime -> Run All**.
     3. Seluruh tabel output bersih otomatis diekspor ke subfolder `colab_outputs/`.

2. **Web Dashboard Interaktif (Poin 4 & 5)**  
   - Folder: `dashboard/` (React + Vite + Recharts)
   - Skrip builder data: `scripts/build_dashboard_data.mjs` (mengagregasi 138.116 order & 397.569 item menjadi kubus JSON di `dashboard/src/data/biData.json`)
   - Cara menjalankan secara lokal:
     ```powershell
     cd E:\Kelompok_BI\dashboard
     npm install
     npm run dev
     ```
     Lalu buka `http://localhost:5173` di browser.

3. **Laporan Teknis & Dokumentasi Lengkap (Poin 7)**  
   - File: `docs/Technical_Report_BI_Poin_2_to_7.md`
   - Merangkum temuan kuantitatif terverifikasi, audit rekonsiliasi 4 tabel, desain UI/UX & interaktivitas, validasi statistik, limitasi, serta rekomendasi strategis.
