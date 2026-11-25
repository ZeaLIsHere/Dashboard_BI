import fs from 'fs';
import readline from 'readline';
import path from 'path';

const DIR = 'E:\\Kelompok_BI';
const OUT_FILE = 'E:\\Kelompok_BI\\dashboard\\src\\data\\biData.json';

function parseCSVLine(line) {
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      res.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

async function readCSV(filename, onRow) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(DIR, filename), { encoding: 'utf8' }),
    crlfDelay: Infinity
  });
  let headers = null;
  let idx = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (!headers) {
      headers = cols;
      idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    } else {
      onRow(cols, idx);
    }
  }
}

const round2 = (n) => Math.round(n * 100) / 100;

async function main() {
  // 1. Products
  const products = new Map();
  await readCSV('product_catalog.csv', (c, i) => {
    products.set(c[i.product_id], {
      category: c[i.product_category],
      subcategory: c[i.product_subcategory],
      brand: c[i.brand],
      supplier: c[i.supplier],
      unit_price: parseFloat(c[i.unit_price]),
      product_cost: parseFloat(c[i.product_cost]),
    });
  });

  // 2. Customers
  const customers = new Map();
  await readCSV('customer_master.csv', (c, i) => {
    customers.set(c[i.customer_id], {
      segment: c[i.customer_segment],
      cac: parseFloat(c[i.customer_acquisition_cost]),
    });
  });

  // 3. Orders
  const ordersMap = new Map();
  const ordersCubeMap = new Map();
  const monthlyCubeMap = new Map();
  const marketingMap = new Map();
  const paymentMap = new Map();
  const shipMethodMap = new Map();
  const returnReasonMap = new Map();
  const warehouseMap = new Map();
  const segmentClvMap = new Map();
  const sentimentMap = new Map();

  let totalOrders = 0;
  let completedOrdersN = 0;
  let sumAovComp = 0, sqAovComp = 0;
  let sumMargin = 0, sqMargin = 0;
  let sumTrueMargin = 0, sqTrueMargin = 0;
  let sumRating = 0, sqRating = 0, ratingN = 0;

  // For Welch t-test & correlations
  const delayedRatings = [];
  const ontimeRatings = [];
  const discList = [];
  const marginList = [];
  const delayDaysList = [];
  const delayRatingList = [];

  await readCSV('ecommerce_sales_customer_analytics_150k.csv', (c, i) => {
    totalOrders++;
    const oid = c[i.order_id];
    const cid = c[i.customer_id];
    const date = c[i.order_date];
    const yr = date.slice(0, 4);
    const ym = date.slice(0, 7);
    const status = c[i.order_status];
    const channel = c[i.sales_channel];
    const seg = c[i.customer_segment];
    const ctype = c[i.customer_type];
    const country = c[i.customer_country];
    const region = c[i.region];
    const delivStatus = c[i.delivery_status];
    const payMethod = c[i.payment_method];
    const shipMethod = c[i.shipping_method];
    const warehouse = c[i.warehouse];
    const mkt = c[i.marketing_channel];
    const retReason = c[i.return_reason];
    const sentiment = c[i.review_sentiment];

    const delivDays = parseFloat(c[i.delivery_days]);
    const estDays = parseFloat(c[i.estimated_delivery_days]);
    const rating = parseFloat(c[i.customer_rating]);

    const gross = parseFloat(c[i.gross_sales]);
    const disc = parseFloat(c[i.discount_amount]);
    const tax = parseFloat(c[i.tax_amount]);
    const ship = parseFloat(c[i.shipping_cost]);
    const net = parseFloat(c[i.net_sales]);
    const cost = parseFloat(c[i.product_cost]);
    const profit = parseFloat(c[i.profit]);
    const trueProfit = net - tax - ship - cost;
    const margin = parseFloat(c[i.profit_margin_percentage]);
    const trueMargin = net > 0 ? (trueProfit / net) * 100 : 0;
    const clv = parseFloat(c[i.customer_lifetime_value]);
    const isRepeat = c[i.is_repeat_customer] === 'True' ? 1 : 0;

    ordersMap.set(oid, {
      cid, yr, ym, status, channel, seg, country, net, gross, disc, profit, trueProfit, margin, rating
    });

    // Cube 1: [yr, status, channel, seg, country, delivStatus]
    const k1 = `${yr}|${status}|${channel}|${seg}|${country}|${delivStatus}`;
    let o1 = ordersCubeMap.get(k1);
    if (!o1) {
      o1 = {
        y: yr, st: status, ch: channel, sg: seg, co: country, ds: delivStatus,
        n: 0, gr: 0, di: 0, tx: 0, sh: 0, cs: 0, nt: 0, pr: 0, tp: 0,
        rs: 0, rn: 0, dd: 0, ed: 0, dn: 0, np: 0, ntp: 0, rp: 0
      };
      ordersCubeMap.set(k1, o1);
    }
    o1.n++; o1.gr += gross; o1.di += disc; o1.tx += tax; o1.sh += ship; o1.cs += cost;
    o1.nt += net; o1.pr += profit; o1.tp += trueProfit;
    if (profit < 0) o1.np++;
    if (trueProfit < 0) o1.ntp++;
    if (isRepeat) o1.rp++;
    if (!isNaN(rating)) { o1.rs += rating; o1.rn++; }
    if (!isNaN(delivDays)) { o1.dd += delivDays; o1.ed += estDays; o1.dn++; }

    // Cube 2: Monthly [ym, status, channel, country]
    const k2 = `${ym}|${status}|${channel}|${country}`;
    let o2 = monthlyCubeMap.get(k2);
    if (!o2) {
      o2 = { ym, st: status, ch: channel, co: country, n: 0, gr: 0, di: 0, nt: 0, pr: 0, tp: 0, np: 0 };
      monthlyCubeMap.set(k2, o2);
    }
    o2.n++; o2.gr += gross; o2.di += disc; o2.nt += net; o2.pr += profit; o2.tp += trueProfit;
    if (profit < 0) o2.np++;

    // Dimension summaries
    const addDim = (map, key) => {
      let d = map.get(key);
      if (!d) {
        d = { key, orders: 0, completed: 0, returned: 0, cancelled: 0, net: 0, realizedNet: 0, profit: 0, trueProfit: 0, realizedTrueProfit: 0, disc: 0, gross: 0, ratingSum: 0, ratingN: 0, delayedN: 0, negProfitN: 0 };
        map.set(key, d);
      }
      d.orders++;
      d.gross += gross; d.disc += disc; d.net += net; d.profit += profit; d.trueProfit += trueProfit;
      if (status === 'Completed') { d.completed++; d.realizedNet += net; d.realizedTrueProfit += trueProfit; }
      else if (status === 'Returned') d.returned++;
      else if (status === 'Cancelled') d.cancelled++;
      if (delivStatus === 'Delayed') d.delayedN++;
      if (profit < 0) d.negProfitN++;
      if (!isNaN(rating)) { d.ratingSum += rating; d.ratingN++; }
    };

    addDim(marketingMap, mkt);
    addDim(paymentMap, payMethod);
    addDim(shipMethodMap, shipMethod);
    addDim(warehouseMap, warehouse);
    if (status === 'Returned' && retReason) addDim(returnReasonMap, retReason);

    if (sentiment) {
      const sk = `${delivStatus}|${sentiment}`;
      sentimentMap.set(sk, (sentimentMap.get(sk) || 0) + 1);
    }

    // Segment CLV + Customer type
    let sc = segmentClvMap.get(seg);
    if (!sc) {
      sc = { segment: seg, orders: 0, clvSum: 0, customers: new Set(), repeatOrders: 0, newOrders: 0, returningOrders: 0, loyalOrders: 0, net: 0, trueProfit: 0, negProfitN: 0, disc: 0, gross: 0 };
      segmentClvMap.set(seg, sc);
    }
    sc.orders++; sc.clvSum += clv; sc.customers.add(cid); sc.net += net; sc.trueProfit += trueProfit; sc.disc += disc; sc.gross += gross;
    if (profit < 0) sc.negProfitN++;
    if (isRepeat) sc.repeatOrders++;
    if (ctype === 'New') sc.newOrders++;
    else if (ctype === 'Returning') sc.returningOrders++;
    else sc.loyalOrders++;

    // Uncertainty stats
    if (status === 'Completed') {
      completedOrdersN++;
      sumAovComp += net; sqAovComp += net * net;
      sumRating += rating; sqRating += rating * rating; ratingN++;
      if (delivStatus === 'Delayed') delayedRatings.push(rating);
      else ontimeRatings.push(rating);
      delayDaysList.push(delivDays - estDays);
      delayRatingList.push(rating);
    }
    sumMargin += margin; sqMargin += margin * margin;
    sumTrueMargin += trueMargin; sqTrueMargin += trueMargin * trueMargin;
    if (gross > 0) {
      discList.push((disc / gross) * 100);
      marginList.push(margin);
    }
  });

  // 4. First pass on order_items to identify 1:1 clean orders vs collision orders
  const itemOrderNet = new Map();
  await readCSV('order_items.csv', (c, i) => {
    const oid = c[i.order_id];
    const net = parseFloat(c[i.net_sales]);
    itemOrderNet.set(oid, (itemOrderNet.get(oid) || 0) + net);
  });

  const collisionOrders = new Set();
  for (const [oid, o] of ordersMap) {
    const inet = itemOrderNet.get(oid) || 0;
    if (Math.abs(inet - o.net) > 0.05) collisionOrders.add(oid);
  }

  // 5. Second pass on order_items to build clean 1:1 Category & Discount cubes + Brands + Simulator Buckets
  const itemsCubeMap = new Map();
  const simBucketsMap = new Map(); // 5% discount bins on Completed clean 1:1 items
  const brandMap = new Map();
  const catCompareMap = new Map(); // full items vs clean 1:1

  let cleanItemsCount = 0;
  let allItemsNet = 0;
  let allItemsProfit = 0;

  await readCSV('order_items.csv', (c, i) => {
    const oid = c[i.order_id];
    const pid = c[i.product_id];
    const qty = parseInt(c[i.quantity], 10);
    const discPct = parseFloat(c[i.discount_percentage]) * 100;
    const discAmt = parseFloat(c[i.discount_amount]);
    const gross = parseFloat(c[i.gross_sales]);
    const tax = parseFloat(c[i.tax_amount]);
    const ship = parseFloat(c[i.shipping_cost]);
    const net = parseFloat(c[i.net_sales]);
    const cost = parseFloat(c[i.product_cost]);
    const profit = parseFloat(c[i.profit]);
    const trueProfit = net - tax - ship - cost;

    allItemsNet += net;
    allItemsProfit += profit;

    const ord = ordersMap.get(oid);
    const prod = products.get(pid);
    if (!ord || !prod) return;

    const cat = prod.category;
    const isClean = !collisionOrders.has(oid);

    let cc = catCompareMap.get(cat);
    if (!cc) {
      cc = { category: cat, fullItems: 0, fullNet: 0, cleanItems: 0, cleanNet: 0 };
      catCompareMap.set(cat, cc);
    }
    cc.fullItems++; cc.fullNet += net;

    if (!isClean) return;
    cleanItemsCount++;
    cc.cleanItems++; cc.cleanNet += net;

    const tier = discPct < 10 ? '0-10%' : discPct < 20 ? '10-20%' : discPct < 30 ? '20-30%' : discPct < 40 ? '30-40%' : discPct < 50 ? '40-50%' : '50%+';

    // itemsCube: [yr, status, channel, cat, tier]
    const ik = `${ord.yr}|${ord.status}|${ord.channel}|${cat}|${tier}`;
    let ic = itemsCubeMap.get(ik);
    if (!ic) {
      ic = { y: ord.yr, st: ord.status, ch: ord.channel, ct: cat, tr: tier, n: 0, q: 0, gr: 0, di: 0, nt: 0, pr: 0, tp: 0, np: 0, ntp: 0 };
      itemsCubeMap.set(ik, ic);
    }
    ic.n++; ic.q += qty; ic.gr += gross; ic.di += discAmt; ic.nt += net; ic.pr += profit; ic.tp += trueProfit;
    if (profit < 0) ic.np++;
    if (trueProfit < 0) ic.ntp++;

    // Brand stats (clean 1:1)
    let br = brandMap.get(prod.brand);
    if (!br) {
      br = { brand: prod.brand, category: cat, items: 0, qty: 0, net: 0, profit: 0, trueProfit: 0, negItems: 0, discSum: 0 };
      brandMap.set(prod.brand, br);
    }
    br.items++; br.qty += qty; br.net += net; br.profit += profit; br.trueProfit += trueProfit; br.discSum += discPct;
    if (profit < 0) br.negItems++;

    // Simulator 2% fine-grained buckets on Completed clean items
    if (ord.status === 'Completed') {
      const binLow = Math.min(60, Math.floor(discPct / 2) * 2);
      const bk = `${binLow}`;
      let sb = simBucketsMap.get(bk);
      if (!sb) {
        sb = { binLow, binMid: binLow + 1, items: 0, gross: 0, disc: 0, net: 0, tax: 0, ship: 0, cost: 0, trueProfit: 0, negTrueN: 0 };
        simBucketsMap.set(bk, sb);
      }
      sb.items++; sb.gross += gross; sb.disc += discAmt; sb.net += net; sb.tax += tax; sb.ship += ship; sb.cost += cost; sb.trueProfit += trueProfit;
      if (trueProfit < 0) sb.negTrueN++;
    }
  });

  // Compute Segment CAC from customer_master
  const segCac = new Map();
  for (const [, cu] of customers) {
    let s = segCac.get(cu.segment);
    if (!s) s = { totalCustomers: 0, sumCac: 0 };
    s.totalCustomers++; s.sumCac += cu.cac;
    segCac.set(cu.segment, s);
  }

  const segmentEcon = Array.from(segmentClvMap.values()).map(sc => {
    const mc = segCac.get(sc.segment);
    const avgCac = mc.sumCac / mc.totalCustomers;
    const avgClv = sc.clvSum / sc.orders;
    return {
      segment: sc.segment,
      totalCustomersMaster: mc.totalCustomers,
      activeCustomers: sc.customers.size,
      avgCac: round2(avgCac),
      avgClv: round2(avgClv),
      clvToCac: round2(avgClv / avgCac),
      orders: sc.orders,
      net: round2(sc.net),
      trueProfit: round2(sc.trueProfit),
      avgDiscPct: round2((sc.disc / sc.gross) * 100),
      negProfitRatePct: round2((sc.negProfitN / sc.orders) * 100),
      repeatRatePct: round2((sc.repeatOrders / sc.orders) * 100),
      newOrders: sc.newOrders,
      returningOrders: sc.returningOrders,
      loyalOrders: sc.loyalOrders,
    };
  });

  // Clean 1:1 vs Full orders comparison
  let cleanN = 0, cleanComp = 0, cleanRet = 0, cleanCompNetSum = 0, cleanMarginSum = 0, cleanRatingSum = 0, cleanRatingN = 0;
  for (const [oid, o] of ordersMap) {
    if (collisionOrders.has(oid)) continue;
    cleanN++;
    if (o.status === 'Completed') {
      cleanComp++;
      cleanCompNetSum += o.net;
      cleanRatingSum += o.rating;
      cleanRatingN++;
    } else if (o.status === 'Returned') cleanRet++;
    cleanMarginSum += o.margin;
  }

  // Stats helpers
  const meanSdCi = (sum, sq, n) => {
    const mean = sum / n;
    const sd = Math.sqrt(Math.max(0, sq / n - mean * mean));
    const ci95 = 1.96 * (sd / Math.sqrt(n));
    return { n, mean: round2(mean), sd: round2(sd), ci95: round2(ci95) };
  };

  const meanArr = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const varArr = (a, m) => a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
  const mDel = meanArr(delayedRatings), mOnt = meanArr(ontimeRatings);
  const vDel = varArr(delayedRatings, mDel), vOnt = varArr(ontimeRatings, mOnt);
  const welchT = (mDel - mOnt) / Math.sqrt(vDel / delayedRatings.length + vOnt / ontimeRatings.length);

  const pearson = (xs, ys) => {
    const n = xs.length;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; syy += ys[i] * ys[i]; sxy += xs[i] * ys[i];
    }
    return (n * sxy - sx * sy) / Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  };

  const roundRow = (r) => {
    const o = { ...r };
    for (const k of ['gr', 'di', 'tx', 'sh', 'cs', 'nt', 'pr', 'tp', 'rs']) {
      if (typeof o[k] === 'number') o[k] = round2(o[k]);
    }
    return o;
  };

  const finalizeDim = (m) => Array.from(m.values()).map(d => ({
    ...d,
    net: round2(d.net),
    realizedNet: round2(d.realizedNet),
    profit: round2(d.profit),
    trueProfit: round2(d.trueProfit),
    realizedTrueProfit: round2(d.realizedTrueProfit),
    disc: round2(d.disc),
    gross: round2(d.gross),
    avgRating: d.ratingN ? round2(d.ratingSum / d.ratingN) : null,
    returnRatePct: round2((d.returned / d.orders) * 100),
    cancelRatePct: round2((d.cancelled / d.orders) * 100),
    negProfitRatePct: round2((d.negProfitN / d.orders) * 100),
    trueMarginPct: d.net ? round2((d.trueProfit / d.net) * 100) : 0,
  })).sort((a, b) => b.net - a.net);

  const output = {
    generatedAt: new Date().toISOString(),
    ordersCube: Array.from(ordersCubeMap.values()).map(roundRow),
    monthlyCube: Array.from(monthlyCubeMap.values()).map(roundRow),
    itemsCube: Array.from(itemsCubeMap.values()).map(roundRow),
    simBuckets: Array.from(simBucketsMap.values()).map(b => ({
      ...b,
      gross: round2(b.gross), disc: round2(b.disc), net: round2(b.net),
      tax: round2(b.tax), ship: round2(b.ship), cost: round2(b.cost), trueProfit: round2(b.trueProfit),
    })).sort((a, b) => a.binLow - b.binLow),
    dimensions: {
      marketing: finalizeDim(marketingMap),
      payment: finalizeDim(paymentMap),
      shippingMethod: finalizeDim(shipMethodMap),
      warehouse: finalizeDim(warehouseMap),
      returnReasons: finalizeDim(returnReasonMap),
      segmentEcon,
      topBrands: Array.from(brandMap.values()).map(b => ({
        ...b,
        net: round2(b.net),
        profit: round2(b.profit),
        trueProfit: round2(b.trueProfit),
        marginPct: round2((b.profit / b.net) * 100),
        trueMarginPct: round2((b.trueProfit / b.net) * 100),
        avgDiscPct: round2(b.discSum / b.items),
      })).sort((a, b) => b.net - a.net).slice(0, 30),
      sentimentByDelivery: Object.fromEntries(sentimentMap),
    },
    validation: {
      totalOrders,
      totalCustomersMaster: customers.size,
      activeCustomers: ordersMap.size > 0 ? new Set(Array.from(ordersMap.values()).map(o => o.cid)).size : 0,
      inactiveCustomers: customers.size - new Set(Array.from(ordersMap.values()).map(o => o.cid)).size,
      totalCatalogProducts: products.size,
      totalOrderItems: 397569,
      clean1to1Orders: cleanN,
      collisionOrdersCount: collisionOrders.size,
      collisionPct: round2((collisionOrders.size / totalOrders) * 100),
      ordersTotalNet: round2(Array.from(ordersMap.values()).reduce((s, o) => s + o.net, 0)),
      itemsTotalNet: round2(allItemsNet),
      itemsOrdersNetGap: round2(allItemsNet - Array.from(ordersMap.values()).reduce((s, o) => s + o.net, 0)),
      cleanItemsCount,
      catCompare: Array.from(catCompareMap.values()).map(c => ({
        category: c.category,
        fullSharePct: round2((c.fullNet / allItemsNet) * 100),
        cleanSharePct: round2((c.cleanNet / Array.from(catCompareMap.values()).reduce((s, x) => s + x.cleanNet, 0)) * 100),
      })),
      stabilityCompare: [
        { metric: 'Jumlah Order', full: totalOrders, clean1to1: cleanN, unit: 'orders' },
        { metric: 'Completed Rate', full: round2((completedOrdersN / totalOrders) * 100), clean1to1: round2((cleanComp / cleanN) * 100), unit: '%' },
        { metric: 'Return Rate', full: round2((9462 / totalOrders) * 100), clean1to1: round2((cleanRet / cleanN) * 100), unit: '%' },
        { metric: 'Completed AOV', full: round2(sumAovComp / completedOrdersN), clean1to1: round2(cleanCompNetSum / cleanComp), unit: '$' },
        { metric: 'Headline Margin', full: round2(sumMargin / totalOrders), clean1to1: round2(cleanMarginSum / cleanN), unit: '%' },
        { metric: 'Customer Rating', full: round2(sumRating / ratingN), clean1to1: round2(cleanRatingSum / cleanRatingN), unit: '★' },
      ],
      uncertainty: {
        completedAOV: meanSdCi(sumAovComp, sqAovComp, completedOrdersN),
        headlineMargin: meanSdCi(sumMargin, sqMargin, totalOrders),
        trueMargin: meanSdCi(sumTrueMargin, sqTrueMargin, totalOrders),
        customerRating: meanSdCi(sumRating, sqRating, ratingN),
        rDiscMarginOrder: round2(pearson(discList, marginList) * 1000) / 1000,
        rDelayRating: round2(pearson(delayDaysList, delayRatingList) * 1000) / 1000,
        welchTDelayRating: round2(welchT),
        delayedMeanRating: round2(mDel),
        ontimeMeanRating: round2(mOnt),
      }
    }
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(output), 'utf8');
  const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log(`Generated ${OUT_FILE} (${sizeKB} KB)`);
  console.log('ordersCube rows:', output.ordersCube.length, 'monthlyCube rows:', output.monthlyCube.length, 'itemsCube rows:', output.itemsCube.length);
}

main().catch(console.error);
