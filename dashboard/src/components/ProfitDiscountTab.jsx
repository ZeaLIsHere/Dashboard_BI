import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ArrowUpDown, Download } from 'lucide-react';
import { formatUSD, formatInt, formatPct, simulateDiscountCap, exportCSV } from '../utils/analyticsEngine';

const NEU_TOOLTIP_STYLE = {
  backgroundColor: '#E0E5EC',
  border: 'none',
  borderRadius: 16,
  color: '#3D4852',
  boxShadow: '6px 6px 12px rgba(163,177,198,0.65), -6px -6px 12px rgba(255,255,255,0.6)',
};

export default function ProfitDiscountTab({ itemAgg, simBuckets, filters }) {
  const [capPct, setCapPct] = useState(30);
  const [volDropPct, setVolDropPct] = useState(10);
  const [sortCol, setSortCol] = useState('net');
  const [sortDir, setSortDir] = useState('desc');

  const { tiers, categories } = itemAgg;

  const simResult = useMemo(
    () => simulateDiscountCap(simBuckets, capPct, volDropPct),
    [simBuckets, capPct, volDropPct]
  );

  const sortedCategories = useMemo(() => {
    const arr = [...categories];
    arr.sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [categories, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const hasCountryOrSegFilter = filters.country !== 'All' || filters.segment !== 'All';

  return (
    <>
      {hasCountryOrSegFilter && (
        <div className="callout">
          <strong>Catatan:</strong> Agregasi level item (<em>clean 1:1 reconciled items</em>) merespons filter <strong>Tahun</strong>, <strong>Kanal</strong>, <strong>Status Order</strong>, dan <strong>Basis Laba</strong>. Filter Negara/Segmen berlaku pada tab Ringkasan &amp; Pelanggan.
        </div>
      )}

      <div className="grid-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Tebing Diskon (Discount Cliff): Margin vs Tingkat Kerugian</h2>
              <p className="panel-desc">
                Item dengan diskon 0–30% mencatat <strong>0 kerugian</strong>. Di atas 30%, margin anjlok drastis hingga negatif di 50%+.
              </p>
            </div>
          </div>

          <div className="chart-well">
            <div className="chart-box-tall">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tiers} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" />
                  <XAxis dataKey="tier" tick={{ fontSize: 12, fill: '#3D4852', fontWeight: 500 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#6B7280' }} width={45} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#C53030' }} width={45} />
                  <Tooltip
                    contentStyle={NEU_TOOLTIP_STYLE}
                    formatter={(value, name) => [`${Number(value).toFixed(2)}%`, name]}
                  />
                  <ReferenceLine yAxisId="left" y={0} stroke="#3D4852" strokeDasharray="4 4" />
                  <Bar yAxisId="left" dataKey="marginPct" name="Profit Margin (%)" radius={[6, 6, 0, 0]}>
                    {tiers.map((t) => (
                      <Cell
                        key={t.tier}
                        fill={t.marginPct < 0 ? '#C53030' : t.marginPct < 20 ? '#B45309' : '#38B2AC'}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="lossRatePct"
                    name="Rasio Item Rugi (%)"
                    stroke="#6C63FF"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6C63FF' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Simulator Kebijakan Batas Diskon (What-If)</h2>
              <p className="panel-desc">
                Simulasi interaktif pada item <em>Completed (1:1 Clean)</em> untuk menguji batas diskon maksimal dan risiko turunnya permintaan.
              </p>
            </div>
          </div>

          <div className="sim-grid">
            <div className="range-field">
              <div className="range-head">
                <label htmlFor="sim-cap">Batas Maksimal Diskon</label>
                <span className="mono">{capPct}%</span>
              </div>
              <input
                id="sim-cap"
                className="range-input"
                type="range"
                min={16}
                max={50}
                step={2}
                value={capPct}
                onChange={(e) => setCapPct(Number(e.target.value))}
              />
              <span style={{ fontSize: 12, color: '#6B7280' }}>Diskon di atas {capPct}% dipangkas menjadi {capPct}%.</span>
            </div>

            <div className="range-field">
              <div className="range-head">
                <label htmlFor="sim-drop">Asumsi Penurunan Volume (Elastisitas)</label>
                <span className="mono">-{volDropPct}%</span>
              </div>
              <input
                id="sim-drop"
                className="range-input"
                type="range"
                min={0}
                max={40}
                step={2}
                value={volDropPct}
                onChange={(e) => setVolDropPct(Number(e.target.value))}
              />
              <span style={{ fontSize: 12, color: '#6B7280' }}>Persentase pembatalan pembelian pada item terdampak.</span>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="callout">
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700 }}>BASELINE TRUE PROFIT</div>
              <div className="num font-display" style={{ fontSize: 22, fontWeight: 800, marginBlock: 4 }}>{formatUSD(simResult.baseProfit, true)}</div>
              <div className="num" style={{ fontSize: 12, color: '#6B7280' }}>{formatInt(simResult.baseNegItems)} item profit negatif</div>
            </div>
            <div className={simResult.profitUplift >= 0 ? 'callout callout-ok' : 'callout callout-risk'}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>SIMULATED TRUE PROFIT</div>
              <div className="num font-display" style={{ fontSize: 22, fontWeight: 800, marginBlock: 4 }}>{formatUSD(simResult.simProfit, true)}</div>
              <div className="num" style={{ fontSize: 12 }}>
                Dampak: <strong>{simResult.profitUplift >= 0 ? '+' : ''}{formatUSD(simResult.profitUplift, true)}</strong> • Sisa rugi: {formatInt(simResult.simNegItems)} item
              </div>
            </div>
          </div>

          <div className="callout">
            Item terdampak kebijakan: <strong className="num">{formatInt(simResult.affectedItems)}</strong> baris item. Perhatikan bahwa bahkan dengan asumsi kehilangan <strong>{volDropPct}%</strong> volume pada item diskon tinggi, pembatasan diskon ke <strong>{capPct}%</strong> tetap {simResult.profitUplift >= 0 ? 'meningkatkan' : 'menurunkan'} laba bersih operasional sebesar <strong className="num">{formatUSD(simResult.profitUplift)}</strong>.
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Kinerja 15 Kategori Produk (Clean 1:1 Reconciled Items)</h2>
            <p className="panel-desc">Klik header kolom untuk mengurutkan. Electronics mencetak revenue tertinggi, namun juga penyumbang item rugi terbesar.</p>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() =>
              exportCSV('kategori_produk_bi.csv', sortedCategories, [
                { key: 'category', label: 'Kategori' },
                { key: 'items', label: 'Jumlah Item' },
                { key: 'qty', label: 'Total Qty' },
                { key: 'net', label: 'Net Sales ($)' },
                { key: 'profit', label: 'Profit ($)' },
                { key: 'marginPct', label: 'Margin (%)' },
                { key: 'avgDiscPct', label: 'Rata-rata Diskon (%)' },
                { key: 'negItems', label: 'Item Rugi' },
              ])
            }
          >
            <Download size={15} aria-hidden="true" />
            Ekspor CSV
          </button>
        </div>

        <div className="table-wrapper" tabIndex={0} role="region" aria-label="Tabel Kinerja Kategori Produk">
          <table className="bi-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="sort-btn" onClick={() => toggleSort('category')}>
                    Kategori <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="num-col">
                  <button type="button" className="sort-btn" onClick={() => toggleSort('items')}>
                    Item <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="num-col">
                  <button type="button" className="sort-btn" onClick={() => toggleSort('net')}>
                    Net Sales <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="num-col">
                  <button type="button" className="sort-btn" onClick={() => toggleSort('profit')}>
                    {filters.profitBasis === 'true' ? 'True Profit' : 'Dataset Profit'} <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="num-col">
                  <button type="button" className="sort-btn" onClick={() => toggleSort('marginPct')}>
                    Margin <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="num-col">
                  <button type="button" className="sort-btn" onClick={() => toggleSort('avgDiscPct')}>
                    Avg Diskon <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="num-col">
                  <button type="button" className="sort-btn" onClick={() => toggleSort('negItems')}>
                    Item Rugi <ArrowUpDown size={12} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((c) => (
                <tr key={c.category}>
                  <th>{c.category}</th>
                  <td className="num-col">{formatInt(c.items)}</td>
                  <td className="num-col">{formatUSD(c.net, true)}</td>
                  <td className="num-col">{formatUSD(c.profit, true)}</td>
                  <td className="num-col">
                    <span className={c.marginPct >= 35 ? 'badge badge-emerald' : c.marginPct >= 28 ? 'badge badge-blue' : 'badge badge-amber'}>
                      {formatPct(c.marginPct, 1)}
                    </span>
                  </td>
                  <td className="num-col">{formatPct(c.avgDiscPct, 1)}</td>
                  <td className="num-col">
                    <span className={c.negItems > 400 ? 'badge badge-crimson' : 'badge badge-neutral'}>
                      {formatInt(c.negItems)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
