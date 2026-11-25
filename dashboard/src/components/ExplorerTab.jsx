import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown, Download } from 'lucide-react';
import { formatUSD, formatInt, formatPct, exportCSV } from '../utils/analyticsEngine';

export default function ExplorerTab({ dimensions }) {
  const [view, setView] = useState('brands'); // 'brands' | 'marketing' | 'warehouse' | 'payment'
  const [query, setQuery] = useState('');
  const [sortCol, setSortCol] = useState('net');
  const [sortDir, setSortDir] = useState('desc');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [];
    if (view === 'brands') {
      list = dimensions.topBrands.map((b) => ({
        name: b.brand,
        sub: b.category,
        count: b.items,
        net: b.net,
        profit: b.trueProfit,
        marginPct: b.trueMarginPct,
        extra: b.avgDiscPct,
        neg: b.negItems,
      }));
    } else if (view === 'marketing') {
      list = dimensions.marketing.map((m) => ({
        name: m.key,
        sub: `${formatPct(m.returnRatePct)} return`,
        count: m.orders,
        net: m.net,
        profit: m.trueProfit,
        marginPct: m.trueMarginPct,
        extra: m.avgRating || 0,
        neg: m.negProfitN,
      }));
    } else if (view === 'warehouse') {
      list = dimensions.warehouse.map((w) => ({
        name: w.key,
        sub: `${formatInt(w.delayedN)} delayed`,
        count: w.orders,
        net: w.net,
        profit: w.trueProfit,
        marginPct: w.trueMarginPct,
        extra: w.avgRating || 0,
        neg: w.negProfitN,
      }));
    } else {
      list = dimensions.payment.map((p) => ({
        name: p.key,
        sub: `${formatPct(p.cancelRatePct)} cancel`,
        count: p.orders,
        net: p.net,
        profit: p.trueProfit,
        marginPct: p.trueMarginPct,
        extra: p.avgRating || 0,
        neg: p.negProfitN,
      }));
    }

    if (q) {
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    return list;
  }, [view, query, sortCol, sortDir, dimensions]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const extraLabel = view === 'brands' ? 'Avg Diskon' : 'Avg Rating';

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Penjelajah Dimensi Operasional (Brand, Marketing, Gudang &amp; Pembayaran)</h2>
          <p className="panel-desc">Cari, urutkan, dan ekspor ringkasan performa per entitas untuk lampiran laporan atau audit internal.</p>
        </div>

        <div className="toolbar-controls">
          <div className="segmented" role="group" aria-label="Pilih dimensi tabel">
            <button type="button" className="seg-btn" aria-pressed={view === 'brands'} onClick={() => setView('brands')}>Top 30 Brand</button>
            <button type="button" className="seg-btn" aria-pressed={view === 'marketing'} onClick={() => setView('marketing')}>Marketing</button>
            <button type="button" className="seg-btn" aria-pressed={view === 'warehouse'} onClick={() => setView('warehouse')}>Gudang</button>
            <button type="button" className="seg-btn" aria-pressed={view === 'payment'} onClick={() => setView('payment')}>Pembayaran</button>
          </div>

          <div className="search-box">
            <Search size={14} className="search-icon" aria-hidden="true" />
            <input
              type="search"
              className="search-input"
              placeholder="Cari nama atau kategori..."
              aria-label="Cari baris tabel"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn"
            onClick={() =>
              exportCSV(`explorer_${view}.csv`, rows, [
                { key: 'name', label: 'Nama' },
                { key: 'sub', label: 'Keterangan' },
                { key: 'count', label: 'Jumlah' },
                { key: 'net', label: 'Net Sales ($)' },
                { key: 'profit', label: 'True Profit ($)' },
                { key: 'marginPct', label: 'True Margin (%)' },
                { key: 'extra', label: extraLabel },
                { key: 'neg', label: 'Rugi Count' },
              ])
            }
          >
            <Download size={14} aria-hidden="true" />
            Ekspor CSV
          </button>
        </div>
      </div>

      <div className="table-wrapper" tabIndex={0} role="region" aria-label="Tabel Penjelajah Dimensi">
        <table className="bi-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="sort-btn" onClick={() => toggleSort('name')}>
                  Entitas <ArrowUpDown size={12} />
                </button>
              </th>
              <th>Atribut</th>
              <th className="num-col">
                <button type="button" className="sort-btn" onClick={() => toggleSort('count')}>
                  {view === 'brands' ? 'Item (1:1)' : 'Order'} <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="num-col">
                <button type="button" className="sort-btn" onClick={() => toggleSort('net')}>
                  Net Sales <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="num-col">
                <button type="button" className="sort-btn" onClick={() => toggleSort('profit')}>
                  True Profit <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="num-col">
                <button type="button" className="sort-btn" onClick={() => toggleSort('marginPct')}>
                  True Margin <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="num-col">
                <button type="button" className="sort-btn" onClick={() => toggleSort('extra')}>
                  {extraLabel} <ArrowUpDown size={12} />
                </button>
              </th>
              <th className="num-col">
                <button type="button" className="sort-btn" onClick={() => toggleSort('neg')}>
                  Rugi Count <ArrowUpDown size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.name}-${r.sub}`}>
                <th>{r.name}</th>
                <td style={{ color: '#6B7280' }}>{r.sub}</td>
                <td className="num-col">{formatInt(r.count)}</td>
                <td className="num-col">{formatUSD(r.net, true)}</td>
                <td className="num-col">{formatUSD(r.profit, true)}</td>
                <td className="num-col">{formatPct(r.marginPct, 1)}</td>
                <td className="num-col">{view === 'brands' ? formatPct(r.extra, 1) : r.extra.toFixed(2)}</td>
                <td className="num-col">{formatInt(r.neg)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#6B7280' }}>
                  Tidak ada data yang cocok dengan pencarian "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
