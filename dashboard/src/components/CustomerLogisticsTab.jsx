import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { formatUSD, formatInt, formatPct } from '../utils/analyticsEngine';

const NEU_TOOLTIP_STYLE = {
  backgroundColor: '#E0E5EC',
  border: 'none',
  borderRadius: 16,
  color: '#3D4852',
  boxShadow: '6px 6px 12px rgba(163,177,198,0.65), -6px -6px 12px rgba(255,255,255,0.6)',
};

export default function CustomerLogisticsTab({ orderAgg, dimensions, filters, setFilter }) {
  const { byDelivery } = orderAgg;
  const { segmentEcon, returnReasons, sentimentByDelivery, shippingMethod } = dimensions;

  const delivChartData = ['Early', 'On Time', 'Delayed']
    .map((k) => {
      const found = byDelivery.find((d) => d.key === k);
      const pos = sentimentByDelivery[`${k}|Positive`] || 0;
      const neu = sentimentByDelivery[`${k}|Neutral`] || 0;
      const neg = sentimentByDelivery[`${k}|Negative`] || 0;
      const tot = pos + neu + neg;
      return {
        status: k,
        orders: found?.orders || 0,
        avgRating: found?.avgRating ? Number(found.avgRating.toFixed(2)) : 0,
        posPct: tot ? Number(((pos / tot) * 100).toFixed(1)) : 0,
        negCount: neg,
      };
    })
    .filter((d) => d.orders > 0);

  return (
    <>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Dampak SLA Pengiriman terhadap Rating (Klik untuk Filter)</h2>
              <p className="panel-desc">
                Pesanan <strong>Delayed</strong> menurunkan rating menjadi <strong>3.22</strong> (vs 4.02 pada <em>Early</em>) dan menyumbang <strong>80,3%</strong> dari seluruh ulasan negatif.
              </p>
            </div>
          </div>

          <div className="chart-well">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={delivChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" />
                  <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#3D4852', fontWeight: 500 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#6B7280' }} width={36} />
                  <Tooltip contentStyle={NEU_TOOLTIP_STYLE} formatter={(val, name) => [name === 'Avg Rating' ? `${val} / 5.0` : `${val}%`, name]} />
                  <Bar
                    dataKey="avgRating"
                    name="Avg Rating"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(d) => setFilter('deliveryStatus', filters.deliveryStatus === d.status ? 'All' : d.status)}
                  >
                    {delivChartData.map((d) => (
                      <Cell
                        key={d.status}
                        fill={
                          filters.deliveryStatus !== 'All' && filters.deliveryStatus !== d.status
                            ? 'rgba(163,177,198,0.5)'
                            : d.status === 'Delayed'
                            ? '#C53030'
                            : d.status === 'Early'
                            ? '#38B2AC'
                            : '#6C63FF'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-wrapper" tabIndex={0} role="region" aria-label="Ringkasan Sentimen dan SLA">
            <table className="bi-table">
              <thead>
                <tr>
                  <th>SLA</th>
                  <th className="num-col">Order</th>
                  <th className="num-col">Rating</th>
                  <th className="num-col">Positif</th>
                  <th className="num-col">Negatif</th>
                </tr>
              </thead>
              <tbody>
                {delivChartData.map((d) => (
                  <tr
                    key={d.status}
                    className={`clickable ${filters.deliveryStatus === d.status ? 'selected-row' : ''}`}
                    onClick={() => setFilter('deliveryStatus', filters.deliveryStatus === d.status ? 'All' : d.status)}
                  >
                    <th>{d.status}</th>
                    <td className="num-col">{formatInt(d.orders)}</td>
                    <td className="num-col">{d.avgRating.toFixed(2)}</td>
                    <td className="num-col">{d.posPct}%</td>
                    <td className="num-col">
                      <span className={d.status === 'Delayed' ? 'badge badge-crimson' : 'badge badge-neutral'}>
                        {formatInt(d.negCount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Diagnostik Alasan Pengembalian (Return Reasons)</h2>
              <p className="panel-desc">Total 9.462 order diretur (6,85% dari total transaksi) dengan nilai $13,17M tersebar merata di 8 penyebab.</p>
            </div>
          </div>

          <div className="chart-well">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returnReasons} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.45)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis type="category" dataKey="key" tick={{ fontSize: 11, fill: '#3D4852' }} width={142} />
                  <Tooltip contentStyle={NEU_TOOLTIP_STYLE} formatter={(v) => [formatInt(v), 'Order Diretur']} />
                  <Bar dataKey="orders" name="Order Diretur" fill="#C53030" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="callout">
            <strong>Temuan Pola Return:</strong> Penyebab kesalahan pemenuhan/kualitas (<em>Wrong Product</em> 1.237, <em>Size Issue</em> 1.182, <em>Defective</em> 1.174, <em>Late Delivery</em> 1.172, <em>Damaged</em> 1.138) terdistribusi hampir seragam (~12–13% masing-masing), menandakan peluang perbaikan operasional lintas gudang secara merata.
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Ekonomi Unit Segmen Pelanggan (CLV, CAC &amp; Kebocoran Diskon VIP/Premium)</h2>
            <p className="panel-desc">Klik baris segmen untuk memfilter dashboard. Segmen Premium &amp; VIP mencatat rasio order rugi ~7x lebih tinggi daripada Consumer.</p>
          </div>
        </div>

        <div className="table-wrapper" tabIndex={0} role="region" aria-label="Tabel Ekonomi Segmen Pelanggan">
          <table className="bi-table">
            <thead>
              <tr>
                <th>Segmen</th>
                <th className="num-col">Pelanggan Aktif</th>
                <th className="num-col">Order</th>
                <th className="num-col">Avg CAC</th>
                <th className="num-col">Avg CLV</th>
                <th className="num-col">CLV : CAC</th>
                <th className="num-col">Avg Diskon</th>
                <th className="num-col">Rasio Order Rugi</th>
                <th className="num-col">Repeat Rate</th>
              </tr>
            </thead>
            <tbody>
              {segmentEcon.map((s) => (
                <tr
                  key={s.segment}
                  className={`clickable ${filters.segment === s.segment ? 'selected-row' : ''}`}
                  onClick={() => setFilter('segment', filters.segment === s.segment ? 'All' : s.segment)}
                >
                  <th>{s.segment}</th>
                  <td className="num-col">{formatInt(s.activeCustomers)}</td>
                  <td className="num-col">{formatInt(s.orders)}</td>
                  <td className="num-col">{formatUSD(s.avgCac)}</td>
                  <td className="num-col">{formatUSD(s.avgClv)}</td>
                  <td className="num-col">
                    <span className="badge badge-emerald">{s.clvToCac.toFixed(1)}x</span>
                  </td>
                  <td className="num-col">{formatPct(s.avgDiscPct)}</td>
                  <td className="num-col">
                    <span className={s.negProfitRatePct > 1 ? 'badge badge-crimson' : 'badge badge-neutral'}>
                      {formatPct(s.negProfitRatePct)}
                    </span>
                  </td>
                  <td className="num-col">{formatPct(s.repeatRatePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Metode Pengiriman (Shipping Method)</h2>
            <p className="panel-desc">Perbandingan volume, return rate, dan margin operasional bersih per layanan pengiriman.</p>
          </div>
        </div>
        <div className="table-wrapper" tabIndex={0} role="region" aria-label="Tabel Metode Pengiriman">
          <table className="bi-table">
            <thead>
              <tr>
                <th>Metode</th>
                <th className="num-col">Order</th>
                <th className="num-col">Net Sales</th>
                <th className="num-col">True Profit</th>
                <th className="num-col">True Margin</th>
                <th className="num-col">Return Rate</th>
                <th className="num-col">Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {shippingMethod.map((sh) => (
                <tr key={sh.key}>
                  <th>{sh.key}</th>
                  <td className="num-col">{formatInt(sh.orders)}</td>
                  <td className="num-col">{formatUSD(sh.net, true)}</td>
                  <td className="num-col">{formatUSD(sh.trueProfit, true)}</td>
                  <td className="num-col">{formatPct(sh.trueMarginPct)}</td>
                  <td className="num-col">{formatPct(sh.returnRatePct)}</td>
                  <td className="num-col">{sh.avgRating?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
