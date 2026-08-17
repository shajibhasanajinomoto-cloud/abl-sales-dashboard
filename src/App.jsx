import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import './App.css'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DEPOT_COLORS = {
  'South Depot': '#0b2c6b',
  'North Depot': '#e31937',
  'CTG Depot': '#f5a623',
  'Outside Dhaka': '#0fa3a3',
  'East CTG (Hill Area)': '#7c5cff',
  Industry: '#8a94a8',
  'Modern Trade': '#c2410c',
  'E-Commerce': '#2563eb',
  Sample: '#94a3b8',
}
const DEFAULT_COLOR = '#94a3b8'
const PAGE_SIZE = 25

function formatBDT(v) {
  if (v == null || isNaN(v)) return '৳0'
  const abs = Math.abs(v)
  if (abs >= 1e7) return '৳' + (v / 1e7).toFixed(2) + ' Cr'
  if (abs >= 1e5) return '৳' + (v / 1e5).toFixed(2) + ' Lakh'
  return '৳' + Math.round(v).toLocaleString('en-US')
}
function formatNum(v) {
  if (v == null || isNaN(v)) return '0'
  return Math.round(v).toLocaleString('en-US')
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="kpi-card">
      <div className="kpi-bar" style={{ background: accent }} />
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [year, setYear] = useState('All')
  const [depot, setDepot] = useState('All')
  const [team, setTeam] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    fetch('/data.json')
      .then((r) => {
        if (!r.ok) throw new Error('data.json load failed (' + r.status + ')')
        return r.json()
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  const years = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.customers.map((r) => r[0]))).sort()
  }, [data])

  const depots = useMemo(() => {
    if (!data) return []
    return Object.keys(data.depot_teams)
  }, [data])

  const teams = useMemo(() => {
    if (!data) return []
    if (depot === 'All') {
      const s = new Set()
      Object.values(data.depot_teams).forEach((arr) => arr.forEach((t) => s.add(t)))
      return Array.from(s).sort()
    }
    return (data.depot_teams[depot] || []).slice().sort()
  }, [data, depot])

  // reset team when depot changes away from a team that no longer applies
  useEffect(() => {
    if (team !== 'All' && !teams.includes(team)) setTeam('All')
  }, [teams]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1)
  }, [year, depot, team, search])

  const filteredCustomers = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.customers.filter((r) => {
      const [y, dp, tm, code, name] = r
      if (year !== 'All' && y !== year) return false
      if (depot !== 'All' && dp !== depot) return false
      if (team !== 'All' && tm !== team) return false
      if (q && !(name.toLowerCase().includes(q) || String(code).includes(q))) return false
      return true
    })
  }, [data, year, depot, team, search])

  // aggregate customers by code+name (in case a customer spans multiple months/products already summed at year/depot/team grain)
  const customerAgg = useMemo(() => {
    const map = new Map()
    for (const r of filteredCustomers) {
      const [, dp, tm, code, name, ctype, qty, amt] = r
      const key = code + '|' + dp + '|' + tm
      if (!map.has(key)) map.set(key, { code, name, depot: dp, team: tm, ctype, qty: 0, amt: 0 })
      const e = map.get(key)
      e.qty += qty
      e.amt += amt
    }
    let arr = Array.from(map.values())
    arr.sort((a, b) => (sortDesc ? b.amt - a.amt : a.amt - b.amt))
    return arr
  }, [filteredCustomers, sortDesc])

  const kpis = useMemo(() => {
    const totalAmt = filteredCustomers.reduce((s, r) => s + r[7], 0)
    const totalQty = filteredCustomers.reduce((s, r) => s + r[6], 0)
    const custSet = new Set(filteredCustomers.map((r) => r[3]))
    return {
      totalAmt,
      totalQty,
      custCount: custSet.size,
      avgPerCust: custSet.size ? totalAmt / custSet.size : 0,
    }
  }, [filteredCustomers])

  const depotBars = useMemo(() => {
    if (!data) return []
    const map = new Map()
    for (const r of data.customers) {
      const [y, dp, tm, , , , qty, amt] = r
      if (year !== 'All' && y !== year) continue
      if (team !== 'All' && tm !== team) continue
      if (!map.has(dp)) map.set(dp, 0)
      map.set(dp, map.get(dp) + amt)
    }
    return Array.from(map.entries())
      .map(([name, amt]) => ({ name, amt }))
      .sort((a, b) => b.amt - a.amt)
  }, [data, year, team])

  const trendData = useMemo(() => {
    if (!data) return []
    const map = new Map()
    for (const r of data.trend) {
      const [y, m, dp, tm, qty, amt] = r
      if (year !== 'All' && y !== year) continue
      if (depot !== 'All' && dp !== depot) continue
      if (team !== 'All' && tm !== team) continue
      const key = y + '-' + String(m).padStart(2, '0')
      if (!map.has(key)) map.set(key, { key, y, m, amt: 0, qty: 0 })
      const e = map.get(key)
      e.amt += amt
      e.qty += qty
    }
    return Array.from(map.values())
      .sort((a, b) => (a.y - b.y) || (a.m - b.m))
      .map((e) => ({ ...e, label: MONTH_NAMES[e.m] + " '" + String(e.y).slice(2) }))
  }, [data, year, depot, team])

  const productData = useMemo(() => {
    if (!data) return []
    const map = new Map()
    for (const r of data.products) {
      const [y, dp, tm, product, qty, amt] = r
      if (year !== 'All' && y !== year) continue
      if (depot !== 'All' && dp !== depot) continue
      if (team !== 'All' && tm !== team) continue
      if (!map.has(product)) map.set(product, 0)
      map.set(product, map.get(product) + amt)
    }
    return Array.from(map.entries())
      .map(([name, amt]) => ({ name: name.replace('AJI-NO-MOTO ', ''), amt }))
      .sort((a, b) => b.amt - a.amt)
  }, [data, year, depot, team])

  const totalPages = Math.max(1, Math.ceil(customerAgg.length / PAGE_SIZE))
  const pageRows = customerAgg.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <div className="state-screen">
        <div className="spinner" />
        <div>Loading sales data…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="state-screen">
        <div style={{ color: 'var(--red)', fontWeight: 600 }}>Could not load data.json</div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>{error}</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">ABL</div>
          <div>
            <h1>Sales Performance Dashboard</h1>
            <div className="brand-sub">Ajinomoto Bangladesh Limited · FY 2024–25</div>
          </div>
        </div>
      </header>

      <div className="filters">
        <div className="filter-group">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
            <option value="All">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Depot</label>
          <select value={depot} onChange={(e) => setDepot(e.target.value)}>
            <option value="All">All depots</option>
            {depots.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Team</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="All">All teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group grow">
          <label>Customer search</label>
          <input
            type="text"
            placeholder="Search by customer name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(year !== 'All' || depot !== 'All' || team !== 'All' || search) && (
          <button
            className="reset-btn"
            onClick={() => {
              setYear('All')
              setDepot('All')
              setTeam('All')
              setSearch('')
            }}
          >
            Reset
          </button>
        )}
      </div>

      <main className="content">
        <section className="kpi-row">
          <KpiCard label="Total Sales Value" value={formatBDT(kpis.totalAmt)} accent="var(--navy)" />
          <KpiCard label="Total Quantity" value={formatNum(kpis.totalQty)} sub="units sold" accent="var(--red)" />
          <KpiCard label="Active Customers" value={formatNum(kpis.custCount)} accent="var(--amber)" />
          <KpiCard label="Avg. Sales / Customer" value={formatBDT(kpis.avgPerCust)} accent="var(--teal)" />
        </section>

        <section className="chart-row">
          <div className="panel">
            <div className="panel-head">
              <h3>Monthly Sales Trend</h3>
              <span className="panel-sub">{depot === 'All' ? 'All depots' : depot}{team !== 'All' ? ' · ' + team : ''}</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--muted)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickFormatter={(v) => formatBDT(v)}
                  width={70}
                />
                <Tooltip formatter={(v) => formatBDT(v)} labelStyle={{ color: 'var(--text)' }} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)' }} />
                <Line type="monotone" dataKey="amt" stroke="var(--navy)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--navy)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Product Mix</h3>
              <span className="panel-sub">by sales value</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickFormatter={(v) => formatBDT(v)} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text)' }} width={110} axisLine={{ stroke: 'var(--border)' }} />
                <Tooltip formatter={(v) => formatBDT(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)' }} />
                <Bar dataKey="amt" radius={[0, 6, 6, 0]}>
                  {productData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? 'var(--red)' : 'var(--navy)'} fillOpacity={i === 0 ? 1 : 0.75 - i * 0.08} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Depot-wise Sales</h3>
            <span className="panel-sub">{year === 'All' ? 'all years' : year}{team !== 'All' ? ' · ' + team : ''}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={depotBars} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={{ stroke: 'var(--border)' }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} tickFormatter={(v) => formatBDT(v)} axisLine={{ stroke: 'var(--border)' }} width={70} />
              <Tooltip formatter={(v) => formatBDT(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)' }} />
              <Bar dataKey="amt" radius={[6, 6, 0, 0]}>
                {depotBars.map((d, i) => (
                  <Cell key={i} fill={DEPOT_COLORS[d.name] || DEFAULT_COLOR} fillOpacity={d.name === depot || depot === 'All' ? 1 : 0.35} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Customer-wise Report</h3>
            <span className="panel-sub">{formatNum(customerAgg.length)} customers matched</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Depot</th>
                  <th>Team</th>
                  <th className="num">Qty</th>
                  <th className="num sortable" onClick={() => setSortDesc((s) => !s)}>
                    Sales Value {sortDesc ? '↓' : '↑'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.code + '-' + r.depot + '-' + r.team + '-' + i}>
                    <td className="cust-name">{r.name}</td>
                    <td className="muted">{r.code}</td>
                    <td>
                      <span className="badge">{r.ctype}</span>
                    </td>
                    <td>{r.depot}</td>
                    <td>{r.team}</td>
                    <td className="num">{formatNum(r.qty)}</td>
                    <td className="num strong">{formatBDT(r.amt)}</td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty">
                      No customers match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ← Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next →
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">Generated from Troyee ERP sales register · {data.meta.source_rows.toLocaleString()} invoice lines · FY Apr 2024 – Mar 2025</footer>
    </div>
  )
}
