import React from 'react';
import { formatUSD, formatInt, formatPct } from '../utils/analyticsEngine';

export default function ValidationTab({ validation }) {
  const {
    totalOrders,
    totalCustomersMaster,
    activeCustomers,
    inactiveCustomers,
    totalCatalogProducts,
    totalOrderItems,
    clean1to1Orders,
    collisionOrdersCount,
    collisionPct,
    ordersTotalNet,
    itemsTotalNet,
    itemsOrdersNetGap,
    cleanItemsCount,
    stabilityCompare,
    uncertainty,
  } = validation;

  return (
    <>
      <section className="kpi-strip" aria-label="Ringkasan Audit dan Validasi Data">
        <article className="kpi-cell">
          <div className="kpi-head">
            <span>Order 1:1 Clean Reconciled</span>
          </div>
          <div className="kpi-value num">{formatInt(clean1to1Orders)}</div>
          <div className="kpi-foot num">
            <span className="badge badge-emerald">{formatPct(100 - collisionPct)} dari {formatInt(totalOrders)} order</span>
          </div>
        </article>

        <article className="kpi-cell">
          <div className="kpi-head">
            <span>Order ID Collision</span>
          </div>
          <div className="kpi-value num">{formatInt(collisionOrdersCount)}</div>
          <div className="kpi-foot num">
            <span className="badge badge-crimson">Selisih Item vs Order: +{formatUSD(itemsOrdersNetGap, true)}</span>
          </div>
        </article>

        <article className="kpi-cell">
          <div className="kpi-head">
            <span>Completed AOV (95% CI)</span>
          </div>
          <div className="kpi-value num">{formatUSD(uncertainty.completedAOV.mean)}</div>
          <div className="kpi-foot num">
            <span>± {formatUSD(uncertainty.completedAOV.ci95)} (SD {formatUSD(uncertainty.completedAOV.sd)})</span>
          </div>
        </article>

        <article className="kpi-cell">
          <div className="kpi-head">
            <span>Korelasi Diskon vs Margin</span>
          </div>
          <div className="kpi-value num">r = {Number(uncertainty.rDiscMarginOrder).toFixed(3)}</div>
          <div className="kpi-foot num">
            <span>Delay vs Rating: r = {Number(uncertainty.rDelayRating).toFixed(3)} (t = {Number(uncertainty.welchTDelayRating).toFixed(1)})</span>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Audit Rekonsiliasi 4 Tabel (Poin 2)</h2>
            <p className="panel-desc">Memverifikasi integritas kunci relasional antar tabel fakta dan dimensi.</p>
          </div>
        </div>

        <div className="table-wrapper" style={{ maxBlockSize: 'none' }} tabIndex={0} role="region" aria-label="Audit Rekonsiliasi Tabel">
          <table className="bi-table">
            <thead>
              <tr>
                <th>Temuan Audit</th>
                <th className="num-col">Nilai Terukur</th>
                <th>Dampak &amp; Mitigasi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Order ID Collision (order_items vs orders)</th>
                <td className="num-col" style={{ whiteSpace: 'nowrap' }}>{formatInt(collisionOrdersCount)} order ({collisionPct}%)</td>
                <td>Tabel <code>order_items.csv</code> ({formatInt(totalOrderItems)} baris) totalnya {formatUSD(itemsTotalNet, true)} vs <code>orders</code> {formatUSD(ordersTotalNet, true)}. Analisis kategori disaring ke {formatInt(cleanItemsCount)} item 1:1 bersih.</td>
              </tr>
              <tr>
                <th>Missing Values Struktural (Non-Random)</th>
                <td className="num-col" style={{ whiteSpace: 'nowrap' }}>24.557 baris (17,78%)</td>
                <td>Nilai kosong pada <code>delivery_days</code> &amp; <code>customer_rating</code> terjadi 100% deterministik pada order non-Completed (Cancelled, Returned, Pending).</td>
              </tr>
              <tr>
                <th>Formula Profit Menyertakan Pajak</th>
                <td className="num-col" style={{ whiteSpace: 'nowrap' }}>138.116 / 138.116 (100%)</td>
                <td><code>profit = net_sales - shipping - cost</code> masih memasukkan <code>tax_amount</code>. Dashboard menyediakan metrik <strong>True Operating Profit</strong> (tanpa pajak).</td>
              </tr>
              <tr>
                <th>Invariansi Mata Uang (Constant USD)</th>
                <td className="num-col" style={{ whiteSpace: 'nowrap' }}>7 kode mata uang</td>
                <td>100% <code>unit_price</code> di 397.569 item (termasuk EUR, GBP, INR, AED) cocok persis dengan harga USD katalog; konversi kurs tidak boleh dilakukan.</td>
              </tr>
              <tr>
                <th>Pelanggan Master Belum Bertransaksi</th>
                <td className="num-col" style={{ whiteSpace: 'nowrap' }}>{formatInt(inactiveCustomers)} / {formatInt(totalCustomersMaster)}</td>
                <td>{formatInt(activeCustomers)} pelanggan aktif bertransaksi; {formatInt(inactiveCustomers)} pelanggan di master belum memiliki order (0,36%).</td>
              </tr>
              <tr>
                <th>Katalog Produk Tercakup</th>
                <td className="num-col" style={{ whiteSpace: 'nowrap' }}>{formatInt(totalCatalogProducts)} SKU</td>
                <td>Seluruh 1.175 produk di katalog terhubung ke transaksi tanpa orphan SKU.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Validasi Stabilitas: Full 138k vs Clean 1:1 126k (Poin 6)</h2>
            <p className="panel-desc">Menguji apakah penghapusan 11.226 order yang mengalami ID collision mengubah metrik utama.</p>
          </div>
        </div>

        <div className="table-wrapper" style={{ maxBlockSize: 'none' }} tabIndex={0} role="region" aria-label="Perbandingan Sampel Penuh vs Clean 1:1">
          <table className="bi-table">
            <thead>
              <tr>
                <th>Metrik</th>
                <th className="num-col">Full (138.116)</th>
                <th className="num-col">Clean 1:1 (126.890)</th>
                <th className="num-col">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {stabilityCompare.map((row) => {
                const diff = Math.abs(row.full - row.clean1to1);
                const fmt = (v) =>
                  row.unit === '$' ? formatUSD(v) : row.unit === '%' ? `${v.toFixed(2)}%` : row.unit === 'orders' ? formatInt(v) : v.toFixed(2);
                return (
                  <tr key={row.metric}>
                    <th>{row.metric}</th>
                    <td className="num-col">{fmt(row.full)}</td>
                    <td className="num-col">{fmt(row.clean1to1)}</td>
                    <td className="num-col">
                      <span className="badge badge-emerald">{row.unit === 'orders' ? `-${formatInt(diff)}` : fmt(diff)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="callout callout-ok">
          <strong>Kesimpulan Validasi:</strong> Selisih antara populasi penuh dan sampel bersih 1:1 kurang dari 0,15% di seluruh rasio kunci. Hal ini membuktikan temuan analitik bebas dari bias seleksi akibat tabrakan ID.
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Keterbatasan Dataset &amp; Ketidakpastian (Limitations &amp; Uncertainty)</h2>
            <p className="panel-desc">Enam batasan metodologis yang wajib dipertimbangkan sebelum mengeksekusi kebijakan bisnis.</p>
          </div>
        </div>

        <div className="grid-3">
          <div className="callout">
            <strong>1. Kolisi 6-Digit Order ID:</strong> Ruang ID acak <code>ORD-XXXXXX</code> memicu 11.226 tabrakan saat 150k order dipangkas menjadi 138.116 baris, meninggalkan item ganda di <code>order_items.csv</code>.
          </div>
          <div className="callout">
            <strong>2. Tidak Ada Data Biaya Marketing/Retur Logistik:</strong> Kolom <code>profit</code> tidak mengurangi biaya iklan per klik (CAC/ROAS) maupun biaya logistik balik (<em>reverse logistics</em>) untuk 9.462 order retur.
          </div>
          <div className="callout">
            <strong>3. Anomali Retensi 99,76% Repeat Rate:</strong> Rasio pelanggan berulang hampir 100% (hanya 334 order berlabel <em>New</em>) mengindikasikan pola simulasi kohort matang; tidak merepresentasikan laju akuisisi ritel baru.
          </div>
          <div className="callout">
            <strong>4. Penyebaran AOV Sangat Lebar (Right-Skewed):</strong> Rata-rata AOV Completed {formatUSD(uncertainty.completedAOV.mean)} memiliki standar deviasi {formatUSD(uncertainty.completedAOV.sd)}, sehingga median lebih representatif untuk pesanan tipikal.
          </div>
          <div className="callout">
            <strong>5. Rating Hilang untuk Order Retur/Batal:</strong> Karena 24.557 order non-Completed tidak memiliki skor ulasan, analisis kepuasan berpotensi mengalami <em>survivorship bias</em> (cenderung lebih tinggi daripada kepuasan riil).
          </div>
          <div className="callout">
            <strong>6. Simulasi What-If Bersifat Ceteris Paribus:</strong> Proyeksi penghematan batas diskon mengasumsikan perilaku kompetitor konstan dan menggunakan slider penurunan volume sebagai aproksimasi elastisitas harga.
          </div>
        </div>
      </section>
    </>
  );
}
