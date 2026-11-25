export function formatUSD(val, compact = false) {
  if (val == null || Number.isNaN(val)) return '—';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (compact) {
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  }
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatInt(val) {
  if (val == null || Number.isNaN(val)) return '—';
  return Math.round(val).toLocaleString('en-US');
}

export function formatPct(val, digits = 2) {
  if (val == null || Number.isNaN(val)) return '—';
  return `${val.toFixed(digits)}%`;
}

export function aggregateOrders(ordersCube, filters) {
  const {
    year = 'All',
    country = 'All',
    channel = 'All',
    segment = 'All',
    deliveryStatus = 'All',
    statusMode = 'all', // 'all' | 'completed'
    profitBasis = 'true', // 'true' | 'headline'
  } = filters;

  const totals = {
    orders: 0,
    completed: 0,
    returned: 0,
    cancelled: 0,
    pending: 0,
    gross: 0,
    disc: 0,
    tax: 0,
    ship: 0,
    cost: 0,
    net: 0,
    profit: 0,
    trueProfit: 0,
    realizedNet: 0,
    realizedProfit: 0,
    realizedTrueProfit: 0,
    ratingSum: 0,
    ratingN: 0,
    delivDaysSum: 0,
    estDaysSum: 0,
    delivN: 0,
    negProfitN: 0,
    negTrueProfitN: 0,
    repeatOrders: 0,
  };

  const byStatus = new Map();
  const byCountry = new Map();
  const byChannel = new Map();
  const bySegment = new Map();
  const byDelivery = new Map();
  const byYear = new Map();

  const pickProfit = (row) => (profitBasis === 'true' ? row.tp : row.pr);

  const addBucket = (map, key, row) => {
    let b = map.get(key);
    if (!b) {
      b = {
        key,
        orders: 0,
        completed: 0,
        returned: 0,
        cancelled: 0,
        pending: 0,
        gross: 0,
        disc: 0,
        tax: 0,
        ship: 0,
        cost: 0,
        net: 0,
        profit: 0,
        trueProfit: 0,
        selectedProfit: 0,
        ratingSum: 0,
        ratingN: 0,
        delivDaysSum: 0,
        estDaysSum: 0,
        delivN: 0,
        negProfitN: 0,
      };
      map.set(key, b);
    }
    b.orders += row.n;
    if (row.st === 'Completed') b.completed += row.n;
    else if (row.st === 'Returned') b.returned += row.n;
    else if (row.st === 'Cancelled') b.cancelled += row.n;
    else if (row.st === 'Pending') b.pending += row.n;

    b.gross += row.gr;
    b.disc += row.di;
    b.tax += row.tx;
    b.ship += row.sh;
    b.cost += row.cs;
    b.net += row.nt;
    b.profit += row.pr;
    b.trueProfit += row.tp;
    b.selectedProfit += pickProfit(row);
    b.ratingSum += row.rs;
    b.ratingN += row.rn;
    b.delivDaysSum += row.dd;
    b.estDaysSum += row.ed;
    b.delivN += row.dn;
    b.negProfitN += profitBasis === 'true' ? row.ntp : row.np;
  };

  for (const row of ordersCube) {
    if (year !== 'All' && row.y !== year) continue;
    if (country !== 'All' && row.co !== country) continue;
    if (channel !== 'All' && row.ch !== channel) continue;
    if (segment !== 'All' && row.sg !== segment) continue;
    if (deliveryStatus !== 'All' && row.ds !== deliveryStatus) continue;

    // Always track full status breakdown under current dimensional filters
    addBucket(byStatus, row.st, row);

    if (statusMode === 'completed' && row.st !== 'Completed') continue;

    totals.orders += row.n;
    if (row.st === 'Completed') {
      totals.completed += row.n;
      totals.realizedNet += row.nt;
      totals.realizedProfit += row.pr;
      totals.realizedTrueProfit += row.tp;
    } else if (row.st === 'Returned') totals.returned += row.n;
    else if (row.st === 'Cancelled') totals.cancelled += row.n;
    else if (row.st === 'Pending') totals.pending += row.n;

    totals.gross += row.gr;
    totals.disc += row.di;
    totals.tax += row.tx;
    totals.ship += row.sh;
    totals.cost += row.cs;
    totals.net += row.nt;
    totals.profit += row.pr;
    totals.trueProfit += row.tp;
    totals.ratingSum += row.rs;
    totals.ratingN += row.rn;
    totals.delivDaysSum += row.dd;
    totals.estDaysSum += row.ed;
    totals.delivN += row.dn;
    totals.negProfitN += row.np;
    totals.negTrueProfitN += row.ntp;
    totals.repeatOrders += row.rp;

    addBucket(byCountry, row.co, row);
    addBucket(byChannel, row.ch, row);
    addBucket(bySegment, row.sg, row);
    addBucket(byDelivery, row.ds, row);
    addBucket(byYear, row.y, row);
  }

  const finalize = (map, sortByNet = true) => {
    const arr = Array.from(map.values()).map((b) => ({
      ...b,
      marginPct: b.net > 0 ? (b.selectedProfit / b.net) * 100 : 0,
      avgRating: b.ratingN > 0 ? b.ratingSum / b.ratingN : null,
      avgDelivDays: b.delivN > 0 ? b.delivDaysSum / b.delivN : null,
      avgEstDays: b.delivN > 0 ? b.estDaysSum / b.delivN : null,
      returnRatePct: b.orders > 0 ? (b.returned / b.orders) * 100 : 0,
      cancelRatePct: b.orders > 0 ? (b.cancelled / b.orders) * 100 : 0,
      avgDiscPct: b.gross > 0 ? (b.disc / b.gross) * 100 : 0,
    }));
    return sortByNet ? arr.sort((a, b) => b.net - a.net) : arr;
  };

  const selectedProfit = profitBasis === 'true' ? totals.trueProfit : totals.profit;
  const selectedNegOrders = profitBasis === 'true' ? totals.negTrueProfitN : totals.negProfitN;

  return {
    totals: {
      ...totals,
      selectedProfit,
      selectedNegOrders,
      marginPct: totals.net > 0 ? (selectedProfit / totals.net) * 100 : 0,
      aov: totals.orders > 0 ? totals.net / totals.orders : 0,
      avgRating: totals.ratingN > 0 ? totals.ratingSum / totals.ratingN : 0,
      avgDiscPct: totals.gross > 0 ? (totals.disc / totals.gross) * 100 : 0,
      returnRatePct: totals.orders > 0 ? (totals.returned / totals.orders) * 100 : 0,
      cancelRatePct: totals.orders > 0 ? (totals.cancelled / totals.orders) * 100 : 0,
      completedRatePct: totals.orders > 0 ? (totals.completed / totals.orders) * 100 : 0,
    },
    byStatus: finalize(byStatus),
    byCountry: finalize(byCountry),
    byChannel: finalize(byChannel),
    bySegment: finalize(bySegment),
    byDelivery: finalize(byDelivery),
    byYear: finalize(byYear, false).sort((a, b) => a.key.localeCompare(b.key)),
  };
}

export function aggregateMonthly(monthlyCube, filters) {
  const { year = 'All', country = 'All', channel = 'All', statusMode = 'all', profitBasis = 'true' } = filters;
  const map = new Map();
  for (const row of monthlyCube) {
    if (year !== 'All' && !row.ym.startsWith(year)) continue;
    if (country !== 'All' && row.co !== country) continue;
    if (channel !== 'All' && row.ch !== channel) continue;
    if (statusMode === 'completed' && row.st !== 'Completed') continue;

    let m = map.get(row.ym);
    if (!m) {
      m = { ym: row.ym, orders: 0, gross: 0, disc: 0, net: 0, profit: 0, negProfitN: 0 };
      map.set(row.ym, m);
    }
    m.orders += row.n;
    m.gross += row.gr;
    m.disc += row.di;
    m.net += row.nt;
    m.profit += profitBasis === 'true' ? row.tp : row.pr;
    m.negProfitN += row.np;
  }
  return Array.from(map.values())
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((m) => ({
      ...m,
      discPct: m.gross > 0 ? Number(((m.disc / m.gross) * 100).toFixed(2)) : 0,
      marginPct: m.net > 0 ? Number(((m.profit / m.net) * 100).toFixed(2)) : 0,
    }));
}

const TIER_ORDER = ['0-10%', '10-20%', '20-30%', '30-40%', '40-50%', '50%+'];

export function aggregateItems(itemsCube, filters) {
  const { year = 'All', channel = 'All', statusMode = 'all', profitBasis = 'true' } = filters;
  const byCategory = new Map();
  const byTier = new Map();

  for (const row of itemsCube) {
    if (year !== 'All' && row.y !== year) continue;
    if (channel !== 'All' && row.ch !== channel) continue;
    if (statusMode === 'completed' && row.st !== 'Completed') continue;

    const prof = profitBasis === 'true' ? row.tp : row.pr;
    const negN = profitBasis === 'true' ? row.ntp : row.np;

    let c = byCategory.get(row.ct);
    if (!c) {
      c = { category: row.ct, items: 0, qty: 0, gross: 0, disc: 0, net: 0, profit: 0, negItems: 0 };
      byCategory.set(row.ct, c);
    }
    c.items += row.n; c.qty += row.q; c.gross += row.gr; c.disc += row.di; c.net += row.nt; c.profit += prof; c.negItems += negN;

    let t = byTier.get(row.tr);
    if (!t) {
      t = { tier: row.tr, items: 0, qty: 0, gross: 0, disc: 0, net: 0, profit: 0, negItems: 0 };
      byTier.set(row.tr, t);
    }
    t.items += row.n; t.qty += row.q; t.gross += row.gr; t.disc += row.di; t.net += row.nt; t.profit += prof; t.negItems += negN;
  }

  const categories = Array.from(byCategory.values())
    .map((c) => ({
      ...c,
      marginPct: c.net > 0 ? (c.profit / c.net) * 100 : 0,
      avgDiscPct: c.gross > 0 ? (c.disc / c.gross) * 100 : 0,
      negRatePct: c.items > 0 ? (c.negItems / c.items) * 100 : 0,
    }))
    .sort((a, b) => b.net - a.net);

  const tiers = TIER_ORDER.map((k) => byTier.get(k)).filter(Boolean).map((t) => ({
    ...t,
    marginPct: t.net > 0 ? Number(((t.profit / t.net) * 100).toFixed(2)) : 0,
    lossRatePct: t.items > 0 ? Number(((t.negItems / t.items) * 100).toFixed(2)) : 0,
  }));

  return { categories, tiers };
}

export function simulateDiscountCap(simBuckets, capPct, volumeDropPct) {
  let baseNet = 0;
  let baseProfit = 0;
  let baseNegItems = 0;
  let simNet = 0;
  let simProfit = 0;
  let simNegItems = 0;
  let affectedItems = 0;

  const volRetention = 1 - volumeDropPct / 100;

  for (const b of simBuckets) {
    baseNet += b.net;
    baseProfit += b.trueProfit;
    baseNegItems += b.negTrueN;

    if (b.binMid <= capPct) {
      simNet += b.net;
      simProfit += b.trueProfit;
      simNegItems += b.negTrueN;
    } else {
      affectedItems += b.items;
      const newDiscRatio = capPct / 100;
      const retainedGross = b.gross * volRetention;
      const newDiscAmt = retainedGross * newDiscRatio;
      const retainedCost = b.cost * volRetention;
      const retainedShip = b.ship * volRetention;
      const retainedTax = b.tax * volRetention;
      const newNet = retainedGross - newDiscAmt + retainedTax + retainedShip;
      const newTrueProfit = newNet - retainedTax - retainedShip - retainedCost;

      simNet += newNet;
      simProfit += newTrueProfit;
      if (newTrueProfit < 0) {
        simNegItems += Math.round(b.items * volRetention);
      }
    }
  }

  return {
    baseNet,
    baseProfit,
    baseNegItems,
    simNet,
    simProfit,
    simNegItems,
    profitUplift: simProfit - baseProfit,
    affectedItems,
  };
}

export function exportCSV(filename, rows, columns) {
  const esc = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
