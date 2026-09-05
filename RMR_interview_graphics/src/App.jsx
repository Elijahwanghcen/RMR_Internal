import { useState, useEffect, useMemo, useRef } from 'react'
import Papa from 'papaparse'
import {
  ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import './App.css'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const COLORS = [
  '#2563eb','#dc2626','#16a34a','#d97706','#7c3aed',
  '#db2777','#0891b2','#65a30d','#c2410c','#4338ca',
  '#be185d','#0f766e','#92400e','#1e40af','#166534'
]

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const LAYOUT_FILTERS = {
  '2b2b': layout => /2.+bed.+2.+bath/i.test(layout),
  '4b4b': layout => /4.+bed.+4.+bath/i.test(layout),
}

function parseDate(month, year) {
  const yi = parseInt(year, 10)
  const mi = MONTHS.indexOf(month?.trim())
  if (isNaN(yi) || yi < 2000 || yi > 2100 || mi === -1) return null
  return new Date(yi, mi, 1)
}

function formatDate(date) {
  const mon = MONTHS[date.getMonth()].slice(0, 3)
  const yr = String(date.getFullYear()).slice(2)
  return `${mon} '${yr}`
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const GROUPS = [
  { label: 'Select All',          match: () => true },
  { label: 'Yugo Apartments',     match: h => /yugo/i.test(h) },
  { label: 'Quarters Apartments', match: h => /quarters/i.test(h) },
  { label: 'The Blocks',          match: h => /block/i.test(h) },
  { label: 'Unions',              match: h => /union/i.test(h) },
  { label: 'Villas',              match: h => /villa/i.test(h) },
  { label: 'Condominiums',        match: h => /condo/i.test(h) },
  { label: 'Not Condominiums',    match: h => !/condo/i.test(h) },
]

function groupState(selectedHoods, matchFn, allHoods) {
  const pool = allHoods.filter(matchFn)
  if (pool.length === 0) return 'none'
  const hits = pool.filter(h => selectedHoods.includes(h)).length
  if (hits === 0) return 'none'
  if (hits === pool.length) return 'all'
  return 'partial'
}

function GroupCheckbox({ label, state, count, onChange }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'partial'
  }, [state])
  return (
    <label className={`group-item ${state !== 'none' ? 'checked' : ''}`}>
      <input
        type="checkbox"
        ref={ref}
        checked={state === 'all'}
        onChange={onChange}
      />
      <span className="group-label">{label}</span>
      <span className="group-count">{count}</span>
    </label>
  )
}

function addBands({ date, sum, sumSq, n, ...rest }) {
  const mean = sum / n
  const pt = { date, rent: Math.round(mean), n }
  if (n > 1) {
    const variance = Math.max(0, sumSq / n - mean * mean)
    const std = Math.sqrt(variance)
    if (std > 0) {
      const upper = Math.round(mean + 2 * std)
      const lower = Math.max(0, Math.round(mean - 2 * std))
      pt.upperBand = upper
      pt.lowerBand = lower
      pt.bandwidth = upper - lower
    }
  }
  return pt
}

let nextId = 2

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const rent = payload.find(p => p.dataKey === 'rent')
  const vol  = payload.find(p => p.dataKey === 'n')
  const pt   = payload[0]?.payload
  const hasband = pt?.lowerBand != null && pt?.upperBand != null
  return (
    <div className="tooltip">
      <div className="tooltip-date">{label}</div>
      {rent && (
        <div className="tooltip-row">
          <span className="tooltip-rent">${rent.value?.toLocaleString()}/mo avg</span>
        </div>
      )}
      {hasband && (
        <div className="tooltip-band">
          <span>±2σ</span>
          <span>${pt.lowerBand.toLocaleString()} – ${pt.upperBand.toLocaleString()}</span>
        </div>
      )}
      {vol && (
        <div className="tooltip-vol">
          {vol.value} submission{vol.value !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

function RentChart({ id, index, chartData, selectedHoods, stackYears, onToggleStack, showBands, onToggleBands, filter2b2b, filter4b4b, onToggleLayout, isActive, featured, onClick, onRemove }) {
  const empty = selectedHoods.length === 0
  const chartHeight = featured ? 500 : 200

  return (
    <div
      className={`chart-card ${isActive ? 'active' : ''} ${featured ? 'featured' : ''}`}
      onClick={onClick}
      title="Click to configure hoods"
    >
      <button
        className="chart-remove"
        onClick={e => { e.stopPropagation(); onRemove() }}
        title="Remove chart"
      >
        ×
      </button>
      <div className="chart-label">
        <span>
          Chart {index + 1}
          {selectedHoods.length > 0 && (
            <span className="chart-label-count"> · {selectedHoods.length} hood{selectedHoods.length !== 1 ? 's' : ''}</span>
          )}
        </span>
        <div className="chart-controls" onClick={e => e.stopPropagation()}>
          <button
            className={`ctrl-btn layout-btn ${filter2b2b ? 'active' : ''}`}
            onClick={() => onToggleLayout('filter2b2b')}
            title="Show 2 Bed / 2 Bath only"
          >
            2B/2B
          </button>
          <button
            className={`ctrl-btn layout-btn ${filter4b4b ? 'active' : ''}`}
            onClick={() => onToggleLayout('filter4b4b')}
            title="Show 4 Bed / 4 Bath only"
          >
            4B/4B
          </button>
          <div className="ctrl-divider" />
          <button
            className={`ctrl-btn ${showBands ? 'active' : ''}`}
            onClick={onToggleBands}
            title="Bollinger Bands ±2σ"
          >
            BB
          </button>
          <label className="stack-toggle">
            <input
              type="checkbox"
              checked={stackYears}
              onChange={onToggleStack}
            />
            Stack years
          </label>
        </div>
      </div>

      {empty ? (
        <div className="chart-empty">
          <span>Click to select hoods</span>
        </div>
      ) : (() => {
        const maxN = Math.max(...chartData.map(d => d.n ?? 0), 1)
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={stackYears ? 0 : 'preserveStartEnd'}
                tickLine={false}
              />
              {/* Price axis */}
              <YAxis
                yAxisId="price"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
                width={48}
                tickLine={false}
                axisLine={false}
              />
              {/* Volume axis — inflated domain pushes bars to bottom ~20% */}
              <YAxis
                yAxisId="vol"
                domain={[0, maxN * 5]}
                hide
              />
              <Tooltip content={<CustomTooltip />} />
              {showBands && <>
                {/* Transparent base lifts the fill to start at lowerBand */}
                <Area
                  yAxisId="price"
                  dataKey="lowerBand"
                  stroke="none"
                  fill="transparent"
                  stackId="bb"
                  isAnimationActive={false}
                  dot={false}
                  connectNulls={false}
                  legendType="none"
                />
                {/* Bandwidth fills from lowerBand to upperBand */}
                <Area
                  yAxisId="price"
                  dataKey="bandwidth"
                  stroke="none"
                  fill="rgba(37,99,235,0.08)"
                  stackId="bb"
                  isAnimationActive={false}
                  dot={false}
                  connectNulls={false}
                  legendType="none"
                />
                {/* Dashed edge lines */}
                <Line
                  yAxisId="price"
                  dataKey="upperBand"
                  stroke="rgba(37,99,235,0.45)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  legendType="none"
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="price"
                  dataKey="lowerBand"
                  stroke="rgba(37,99,235,0.45)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  legendType="none"
                  isAnimationActive={false}
                />
              </>}
              <Bar
                yAxisId="vol"
                dataKey="n"
                fill="#93c5fd"
                opacity={0.55}
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="rent"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: '#2563eb' }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )
      })()}
    </div>
  )
}

export default function App() {
  const [rows, setRows] = useState([])
  const [allHoods, setAllHoods] = useState([])
  const [charts, setCharts] = useState([{ id: 1, selectedHoods: [], stackYears: false, showBands: false, filter2b2b: false, filter4b4b: false }])
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/rents.csv')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then(text => {
        const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
        const cleaned = []
        const hoodSet = new Set()

        data.forEach(row => {
          const rent = parseFloat(row.rent)
          if (isNaN(rent) || rent <= 0) return
          const date = parseDate(row.signingMonth, row.signingYear)
          if (!date) return
          const hood = row.hood?.trim()
          if (!hood) return
          hoodSet.add(hood)
          cleaned.push({
            hood,
            rent,
            date,
            dk: dateKey(date),
            dateLabel: formatDate(date),
            doubleOccupancy: row.doubleOccupancy?.trim().toUpperCase() === 'TRUE',
            layout: row.layout?.trim() || ''
          })
        })

        setRows(cleaned)
        setAllHoods(
          [...hoodSet].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          )
        )
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const chartDataMap = useMemo(() => {
    const map = {}
    charts.forEach(chart => {
      if (chart.selectedHoods.length === 0) { map[chart.id] = []; return }

      let filtered = rows.filter(r => chart.selectedHoods.includes(r.hood))

      if (chart.filter2b2b || chart.filter4b4b) {
        filtered = filtered.filter(r =>
          (chart.filter2b2b && LAYOUT_FILTERS['2b2b'](r.layout)) ||
          (chart.filter4b4b && LAYOUT_FILTERS['4b4b'](r.layout))
        )
      }

      if (chart.stackYears) {
        const groups = {}
        filtered.forEach(r => {
          const mi = r.date.getMonth()
          const key = MONTH_SHORT[mi]
          if (!groups[key]) groups[key] = { mi, sum: 0, sumSq: 0, n: 0 }
          groups[key].sum += r.rent
          groups[key].sumSq += r.rent * r.rent
          groups[key].n++
        })
        map[chart.id] = MONTH_SHORT
          .filter(m => groups[m])
          .map(m => addBands({ date: m, ...groups[m] }))
      } else {
        const groups = {}
        filtered.forEach(r => {
          if (!groups[r.dk]) groups[r.dk] = { date: r.date, dateLabel: r.dateLabel, sum: 0, sumSq: 0, n: 0 }
          groups[r.dk].sum += r.rent
          groups[r.dk].sumSq += r.rent * r.rent
          groups[r.dk].n++
        })
        map[chart.id] = Object.values(groups)
          .sort((a, b) => a.date - b.date)
          .map(g => addBands({ ...g, date: g.dateLabel }))
      }
    })
    return map
  }, [rows, charts])

  const addChart = () => {
    if (charts.length >= 6) return
    setCharts(c => [...c, { id: nextId++, selectedHoods: [], stackYears: false, showBands: false, filter2b2b: false, filter4b4b: false }])
  }

  const removeChart = id => {
    setCharts(c => c.filter(ch => ch.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const toggleHood = (chartId, hood) => {
    setCharts(c => c.map(ch => {
      if (ch.id !== chartId) return ch
      const has = ch.selectedHoods.includes(hood)
      return {
        ...ch,
        selectedHoods: has
          ? ch.selectedHoods.filter(h => h !== hood)
          : [...ch.selectedHoods, hood]
      }
    }))
  }

  const clearHoods = chartId => {
    setCharts(c => c.map(ch =>
      ch.id === chartId ? { ...ch, selectedHoods: [] } : ch
    ))
  }

  const toggleStack = id => {
    setCharts(c => c.map(ch => ch.id === id ? { ...ch, stackYears: !ch.stackYears } : ch))
  }

  const toggleBands = id => {
    setCharts(c => c.map(ch => ch.id === id ? { ...ch, showBands: !ch.showBands } : ch))
  }

  const toggleLayoutFilter = (id, key) => {
    setCharts(c => c.map(ch => ch.id === id ? { ...ch, [key]: !ch[key] } : ch))
  }

  const toggleGroup = (chartId, matchFn) => {
    setCharts(c => c.map(ch => {
      if (ch.id !== chartId) return ch
      const pool = allHoods.filter(matchFn)
      const allSelected = pool.every(h => ch.selectedHoods.includes(h))
      if (allSelected) {
        return { ...ch, selectedHoods: ch.selectedHoods.filter(h => !pool.includes(h)) }
      } else {
        const toAdd = pool.filter(h => !ch.selectedHoods.includes(h))
        return { ...ch, selectedHoods: [...ch.selectedHoods, ...toAdd] }
      }
    }))
  }

  const activeChart = charts.find(c => c.id === activeId)
  const filteredHoods = search
    ? allHoods.filter(h => h.toLowerCase().includes(search.toLowerCase()))
    : allHoods

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>RMR Rental Dashboard</h1>
          {!loading && !error && (
            <span className="header-sub">
              {rows.length} data points · {allHoods.length} properties
            </span>
          )}
        </div>
      </header>

      {loading && <div className="status">Loading data…</div>}
      {error && <div className="status error">Error loading CSV: {error}</div>}

      {!loading && !error && (
        <main className="main" style={{ marginRight: activeId ? 316 : 0 }}>
          <div className="grid">
            {charts.map((chart, i) => (
              <RentChart
                key={chart.id}
                id={chart.id}
                index={i}
                chartData={chartDataMap[chart.id] || []}
                selectedHoods={chart.selectedHoods}
                stackYears={chart.stackYears}
                onToggleStack={() => toggleStack(chart.id)}
                showBands={chart.showBands}
                onToggleBands={() => toggleBands(chart.id)}
                filter2b2b={chart.filter2b2b}
                filter4b4b={chart.filter4b4b}
                onToggleLayout={key => toggleLayoutFilter(chart.id, key)}
                isActive={activeId === chart.id}
                featured={i === 0}
                onClick={() => setActiveId(activeId === chart.id ? null : chart.id)}
                onRemove={() => removeChart(chart.id)}
              />
            ))}
            {charts.length < 6 && (
              <button className="add-chart" onClick={addChart}>
                <span className="add-icon">+</span>
                <span>Add Chart</span>
              </button>
            )}
          </div>
        </main>
      )}

      {/* Side panel */}
      <aside className={`panel ${activeId ? 'open' : ''}`}>
        {activeChart && (
          <>
            <div className="panel-header">
              <h2>Configure Chart {charts.indexOf(activeChart) + 1}</h2>
              <button className="panel-close" onClick={() => setActiveId(null)}>×</button>
            </div>

            <div className="panel-meta">
              <span>{activeChart.selectedHoods.length} selected</span>
              {activeChart.selectedHoods.length > 0 && (
                <button className="panel-clear" onClick={() => clearHoods(activeId)}>
                  Clear all
                </button>
              )}
            </div>

            <input
              className="panel-search"
              placeholder="Search properties…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />

            <div className="quick-select">
              <div className="section-label">Quick Select</div>
              {GROUPS.map(g => {
                const count = allHoods.filter(g.match).length
                const state = groupState(activeChart.selectedHoods, g.match, allHoods)
                return (
                  <GroupCheckbox
                    key={g.label}
                    label={g.label}
                    state={state}
                    count={count}
                    onChange={() => toggleGroup(activeId, g.match)}
                  />
                )
              })}
            </div>

            <div className="section-label section-label--hoods">All Properties</div>
            <div className="hood-list">
              {filteredHoods.length === 0 && (
                <div className="hood-empty">No matches</div>
              )}
              {filteredHoods.map(hood => {
                const checked = activeChart.selectedHoods.includes(hood)
                return (
                  <label key={hood} className={`hood-item ${checked ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHood(activeId, hood)}
                    />
                    <span className="hood-name">{hood}</span>
                  </label>
                )
              })}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
