import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Percent,
  Users,
  ShieldCheck,
  Table2,
  RotateCcw,
  X,
  Menu,
} from 'lucide-react';
import biData from './data/biData.json';
import { aggregateOrders, aggregateMonthly, aggregateItems } from './utils/analyticsEngine';
import OverviewTab from './components/OverviewTab';
import ProfitDiscountTab from './components/ProfitDiscountTab';
import CustomerLogisticsTab from './components/CustomerLogisticsTab';
import ValidationTab from './components/ValidationTab';
import ExplorerTab from './components/ExplorerTab';
import NeuSelect from './components/NeuSelect';

const TABS = [
  { id: 'overview', label: 'Ringkasan Eksekutif', icon: LayoutDashboard },
  { id: 'profit', label: 'Profitabilitas & Diskon', icon: Percent },
  { id: 'customers', label: 'Pelanggan & SLA Logistik', icon: Users },
  { id: 'validation', label: 'Validasi & Limitasi', icon: ShieldCheck },
  { id: 'explorer', label: 'Penjelajah Dimensi', icon: Table2 },
];

const INITIAL_FILTERS = {
  year: 'All',
  country: 'All',
  channel: 'All',
  segment: 'All',
  deliveryStatus: 'All',
  statusMode: 'all',
  profitBasis: 'true',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  const orderAgg = useMemo(() => aggregateOrders(biData.ordersCube, filters), [filters]);
  const monthlyData = useMemo(() => aggregateMonthly(biData.monthlyCube, filters), [filters]);
  const itemAgg = useMemo(() => aggregateItems(biData.itemsCube, filters), [filters]);

  const activeChips = [
    filters.year !== 'All' && { key: 'year', label: `Tahun: ${filters.year}` },
    filters.country !== 'All' && { key: 'country', label: `Negara: ${filters.country}` },
    filters.channel !== 'All' && { key: 'channel', label: `Kanal: ${filters.channel}` },
    filters.segment !== 'All' && { key: 'segment', label: `Segmen: ${filters.segment}` },
    filters.deliveryStatus !== 'All' && { key: 'deliveryStatus', label: `SLA: ${filters.deliveryStatus}` },
  ].filter(Boolean);

  const activeTabMeta = TABS.find((t) => t.id === activeTab);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navigasi Dashboard">
        <div className="sidebar-surface">
          <div className="brand-row">
            <div className="brand-block">
              <p className="brand-title">Dashboard BI</p>
            </div>

            <button
              type="button"
              className="mobile-menu-btn"
              aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <nav className={`nav-list ${mobileMenuOpen ? '' : 'mobile-closed'}`}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="nav-btn"
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className="nav-icon-dot" aria-hidden="true">
                    <Icon size={15} />
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-row">
            <div>
              <h1 className="page-heading">{activeTabMeta.label}</h1>
              <p className="page-subtitle">
                Analisis Profitabilitas, Kebocoran Diskon, SLA Pengiriman &amp; Validasi E-Commerce
              </p>
            </div>

            <div className="toolbar-controls">
              <div className="segmented" role="group" aria-label="Mode Status Order">
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={filters.statusMode === 'all'}
                  onClick={() => setFilter('statusMode', 'all')}
                >
                  Semua Status (Headline)
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={filters.statusMode === 'completed'}
                  onClick={() => setFilter('statusMode', 'completed')}
                >
                  Completed Only (Realized)
                </button>
              </div>

              <div className="segmented" role="group" aria-label="Basis Perhitungan Laba">
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={filters.profitBasis === 'true'}
                  onClick={() => setFilter('profitBasis', 'true')}
                >
                  True Profit (Excl. Tax)
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={filters.profitBasis === 'headline'}
                  onClick={() => setFilter('profitBasis', 'headline')}
                >
                  Dataset Profit (Incl. Tax)
                </button>
              </div>
            </div>
          </div>

          <div className="filter-bar">
            <NeuSelect
              id="flt-year"
              label="Tahun"
              value={filters.year}
              onChange={(val) => setFilter('year', val)}
              options={[
                { value: 'All', label: 'Semua (2021–2025)' },
                { value: '2021', label: '2021' },
                { value: '2022', label: '2022' },
                { value: '2023', label: '2023' },
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
              ]}
            />

            <NeuSelect
              id="flt-country"
              label="Negara"
              value={filters.country}
              onChange={(val) => setFilter('country', val)}
              options={[
                { value: 'All', label: 'Semua Negara' },
                { value: 'USA', label: 'USA' },
                { value: 'UK', label: 'UK' },
                { value: 'Germany', label: 'Germany' },
                { value: 'Canada', label: 'Canada' },
                { value: 'Australia', label: 'Australia' },
                { value: 'India', label: 'India' },
                { value: 'UAE', label: 'UAE' },
              ]}
            />

            <NeuSelect
              id="flt-channel"
              label="Kanal Penjualan"
              value={filters.channel}
              onChange={(val) => setFilter('channel', val)}
              options={[
                { value: 'All', label: 'Semua Kanal' },
                { value: 'Mobile App', label: 'Mobile App' },
                { value: 'Website', label: 'Website' },
                { value: 'Marketplace', label: 'Marketplace' },
                { value: 'Social Media', label: 'Social Media' },
              ]}
            />

            <NeuSelect
              id="flt-segment"
              label="Segmen Pelanggan"
              value={filters.segment}
              onChange={(val) => setFilter('segment', val)}
              options={[
                { value: 'All', label: 'Semua Segmen' },
                { value: 'Consumer', label: 'Consumer' },
                { value: 'Premium', label: 'Premium' },
                { value: 'VIP', label: 'VIP' },
                { value: 'Business', label: 'Business' },
              ]}
            />

            {activeChips.length > 0 && (
              <div className="active-chips" style={{ paddingBottom: 2 }}>
                {activeChips.map((c) => (
                  <span key={c.key} className="chip">
                    {c.label}
                    <button type="button" aria-label={`Hapus filter ${c.label}`} onClick={() => setFilter(c.key, 'All')}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <button type="button" className="btn" onClick={resetFilters}>
                  <RotateCcw size={14} aria-hidden="true" />
                  Reset
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content-area">
          {activeTab === 'overview' && (
            <OverviewTab
              orderAgg={orderAgg}
              monthlyData={monthlyData}
              filters={filters}
              setFilter={setFilter}
            />
          )}
          {activeTab === 'profit' && (
            <ProfitDiscountTab
              itemAgg={itemAgg}
              simBuckets={biData.simBuckets}
              filters={filters}
            />
          )}
          {activeTab === 'customers' && (
            <CustomerLogisticsTab
              orderAgg={orderAgg}
              dimensions={biData.dimensions}
              filters={filters}
              setFilter={setFilter}
            />
          )}
          {activeTab === 'validation' && (
            <ValidationTab validation={biData.validation} />
          )}
          {activeTab === 'explorer' && (
            <ExplorerTab dimensions={biData.dimensions} />
          )}
        </main>
      </div>
    </div>
  );
}
