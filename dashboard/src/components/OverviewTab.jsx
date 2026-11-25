import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { formatUSD, formatInt, formatPct } from '../utils/analyticsEngine';

const STATUS_COLORS = {
  Completed: '#38B2AC',
  Returned: '#C53030',
  Cancelled: '#B45309',
  Pending: '#6B7280',
};

const NEU_TOOLTIP_STYLE = {
  background: '#E0E5EC',
  border: 'none',
  borderRadius: 16,
  padding: '10px 12px',
  fontSize: 12,
  color: '#3D4852',
  boxShadow: '6px 6px 12px rgba(163,177,198,0.65), -6px -6px 12px rgba(255,255,255,0.6)',
};

function CustomTooltip({ active, payload, label, mode }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div style={NEU_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#3D4852' }}>{label || row?.key}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="num" style={{ color: p.color || '#3D4852', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{p.name}:</span>
          <strong>
            {mode === 'count' ? formatInt(p.value) : mode === 'pct' ? formatPct(p.value) : formatUSD(p.value, true)}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function OverviewTab({ orderAgg, monthlyData, filters, setFilter }) {
  const [trendMetric, setTrendMetric] = useState('net_profit');
  const { totals, byStatus, byCountry, byChannel } = orderAgg;

  const isCompletedOnly = filters.statusMode === 'completed';
  const isTrueProfit = filters.profitBasis === 'true';

  const totalAllStatusesNet = byStatus.reduce((s, r) => s + r.net, 0);
  const completedRow = byStatus.find((r) => r.key === 'Completed');
  const unrealizedNet = totalAllStatusesNet - (completedRow?.net || 0);

  return (
    <>
      <section className="kpi-strip" aria-label="Ringkasan Metrik Utama">
        <article className="kpi-cell">
          <div className="kpi-head">
            <span>{isCompletedOnly ? 'Realized Net Sales' : 'Headline Net Sales'}</span>
          </div>
          <div className="kpi-value num">{formatUSD(totals.net, true)}</div>
          <div className="kpi-foot num">
            <span className={isCompletedOnly ? 'badge badge-emerald' : 'badge badge-amber'}>
              {isCompletedOnly ? 'Completed Only' : `${formatUSD(unrealizedNet, true)} Belum Terealisasi`}
            </span>
          </div>
        </article>

        <article className="kpi-cell">
          <div className="kpi-head">
            <span>{isTrueProfit ? 'True Operating Profit' : 'Dataset Profit (Incl. Tax)'}</span>
          </div>
          <div className="kpi-value num">{formatUSD(totals.selectedProfit, true)}</div>
          <div className="kpi-foot num">
            <span className="badge badge-blue">Margin {formatPct(totals.marginPct)}</span>
            <span>{formatInt(totals.selectedNegOrders)} order rugi</span>
          </div>
        </article>

        <article className="kpi-cell">
          <div className="kpi-head">
            <span>Total Transaksi</span>
          </div>
          <div className="kpi-value num">{formatInt(totals.orders)}</div>
          <div className="kpi-foot num">
            <span>AOV {formatUSD(totals.aov)}</span>
            {!isCompletedOnly && (
              <span className="badge badge-crimson">Return {formatPct(totals.returnRatePct)}</span>
            )}
          </div>
        </article>

        <article className="kpi-cell">
          <div className="kpi-head">
            <span>Rata-rata Rating &amp; Diskon</span>
          </div>
          <div className="kpi-value num">{totals.avgRating ? totals.avgRating.toFixed(2) : '—'} / 5.0</div>
          <div className="kpi-foot num">
            <span>Rata-rata Diskon {formatPct(totals.avgDiscPct)}</span>
          </div>
        </article>
      </section>

      {!isCompletedOnly && totalAllStatusesNet > 0 && (
        <div className="callout callout-warn">
          <strong>Rekonsiliasi Revenue:</strong> Angka headline mencakup <strong>{formatUSD(unrealizedNet)}</strong> ({formatPct((unrealizedNet / totalAllStatusesNet) * 100)}) dari order berstatus <em>Returned</em>, <em>Cancelled</em>, dan <em>Pending</em>. Aktifkan mode <strong>Completed Only</strong> di bilah atas untuk melihat pendapatan terealisasi.
        </div>
      )}

      {isCompletedOnly && (
        <div className="callout callout-ok">
          <strong>Mode Realized Aktif:</strong> Seluruh metrik hanya menghitung transaksi berstatus <em>Completed</em> ({formatInt(totals.completed)} order) yang barangnya benar-benar terkirim.
        </div>
      )}

      <div className="grid-2-1">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Tren Bulanan (2021–2025)</h2>
              <p className="panel-desc">Lonjakan diskon setiap November–Desember (musim liburan) memicu lonjakan order rugi.</p>
            </div>
            <div className="segmented" role="group" aria-label="Pilih metrik tren bulanan">
              <button
                type="button"
                className="seg-btn"
                aria-pressed={trendMetric === 'net_profit'}
                onClick={() => setTrendMetric('net_profit')}
              >
                Sales &amp; Profit
              </button>
              <button
                type="button"
                className="seg-btn"
                aria-pressed={trendMetric === 'disc_neg'}
                onClick={() => setTrendMetric('disc_neg')}
              >
                Diskon &amp; Rugi
              </button>
              <button
                type="button"
                className="seg-btn"
                aria-pressed={trendMetric === 'orders'}
                onClick={() => setTrendMetric('orders')}
              >
                Volume Order
              </button>
            </div>
          </div>

          <div className="chart-well">
            <div className="chart-box-tall">
              <ResponsiveContainer width="100%" height="100%">
                {trendMetric === 'net_profit' ? (
                  <ComposedChart data={monthlyData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" />
                    <XAxis dataKey="ym" tick={{ fontSize: 11, fill: '#6B7280' }} minTickGap={24} />
                    <YAxis tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#6B7280' }} width={58} />
                    <Tooltip content={<CustomTooltip mode="usd" />} />
                    <Area type="monotone" dataKey="net" name="Net Sales" stroke="#6C63FF" fill="rgba(108, 99, 255, 0.18)" strokeWidth={2.2} />
                    <Line type="monotone" dataKey="profit" name={isTrueProfit ? 'True Profit' : 'Dataset Profit'} stroke="#38B2AC" strokeWidth={2.4} dot={false} />
                  </ComposedChart>
                ) : trendMetric === 'disc_neg' ? (
                  <ComposedChart data={monthlyData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" />
                    <XAxis dataKey="ym" tick={{ fontSize: 11, fill: '#6B7280' }} minTickGap={24} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} width={42} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#6B7280' }} width={42} />
                    <Tooltip content={<CustomTooltip mode="count" />} />
                    <Bar yAxisId="left" dataKey="negProfitN" name="Order Profit Negatif" fill="#C53030" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="discPct" name="Rata-rata Diskon (%)" stroke="#6C63FF" strokeWidth={2.2} dot={false} />
                  </ComposedChart>
                ) : (
                  <BarChart data={monthlyData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" />
                    <XAxis dataKey="ym" tick={{ fontSize: 11, fill: '#6B7280' }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} width={48} />
                    <Tooltip content={<CustomTooltip mode="count" />} />
                    <Bar dataKey="orders" name="Jumlah Order" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Kebocoran Status Order</h2>
              <p className="panel-desc">Proporsi Net Sales berdasarkan status pemenuhan saat ini.</p>
            </div>
          </div>

          <div className="chart-well">
            <div className="chart-box" style={{ blockSize: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStatus} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis type="category" dataKey="key" tick={{ fontSize: 12, fill: '#3D4852', fontWeight: 500 }} width={82} />
                  <Tooltip content={<CustomTooltip mode="usd" />} />
                  <Bar dataKey="net" name="Net Sales" radius={[0, 8, 8, 0]}>
                    {byStatus.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-wrapper" tabIndex={0} role="region" aria-label="Tabel Status Order">
            <table className="bi-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th className="num-col">Order</th>
                  <th className="num-col">Net Sales</th>
                  <th className="num-col">Porsi</th>
                </tr>
              </thead>
              <tbody>
                {byStatus.map((r) => (
                  <tr key={r.key}>
                    <th>{r.key}</th>
                    <td className="num-col">{formatInt(r.orders)}</td>
                    <td className="num-col">{formatUSD(r.net, true)}</td>
                    <td className="num-col">{formatPct(totalAllStatusesNet ? (r.net / totalAllStatusesNet) * 100 : 0, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Kinerja per Negara (Klik untuk Cross-Filter)</h2>
              <p className="panel-desc">Semua nilai dalam USD konstan. Klik salah satu batang untuk menyaring seluruh dashboard.</p>
            </div>
          </div>
          <div className="chart-well">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCountry} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis type="category" dataKey="key" tick={{ fontSize: 12, fill: '#3D4852' }} width={76} />
                  <Tooltip content={<CustomTooltip mode="usd" />} />
                  <Bar
                    dataKey="net"
                    name="Net Sales"
                    radius={[0, 6, 6, 0]}
                    cursor="pointer"
                    onClick={(data) => setFilter('country', filters.country === data.key ? 'All' : data.key)}
                  >
                    {byCountry.map((c) => (
                      <Cell
                        key={c.key}
                        fill={filters.country === 'All' || filters.country === c.key ? '#6C63FF' : 'rgba(163,177,198,0.55)'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="selectedProfit"
                    name={isTrueProfit ? 'True Profit' : 'Dataset Profit'}
                    radius={[0, 6, 6, 0]}
                    cursor="pointer"
                    onClick={(data) => setFilter('country', filters.country === data.key ? 'All' : data.key)}
                  >
                    {byCountry.map((c) => (
                      <Cell
                        key={c.key}
                        fill={filters.country === 'All' || filters.country === c.key ? '#38B2AC' : 'rgba(163,177,198,0.35)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Kinerja Kanal Penjualan (Klik untuk Cross-Filter)</h2>
              <p className="panel-desc">Mobile App &amp; Website mendominasi 75% transaksi dengan profil margin seragam.</p>
            </div>
          </div>
          <div className="chart-well">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byChannel} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" />
                  <XAxis dataKey="key" tick={{ fontSize: 12, fill: '#3D4852' }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#6B7280' }} width={52} />
                  <Tooltip content={<CustomTooltip mode="usd" />} />
                  <Bar
                    dataKey="net"
                    name="Net Sales"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => setFilter('channel', filters.channel === data.key ? 'All' : data.key)}
                  >
                    {byChannel.map((ch) => (
                      <Cell
                        key={ch.key}
                        fill={filters.channel === 'All' || filters.channel === ch.key ? '#6C63FF' : 'rgba(163,177,198,0.55)'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="selectedProfit"
                    name={isTrueProfit ? 'True Profit' : 'Dataset Profit'}
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => setFilter('channel', filters.channel === data.key ? 'All' : data.key)}
                  >
                    {byChannel.map((ch) => (
                      <Cell
                        key={ch.key}
                        fill={filters.channel === 'All' || filters.channel === ch.key ? '#38B2AC' : 'rgba(163,177,198,0.35)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
