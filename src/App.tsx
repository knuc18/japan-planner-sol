import { useMemo, useRef, useState, type FormEvent } from 'react'
import { JPY_TO_PHP_RATE, RATE_VERIFIED_ON, SOURCES } from './data'
import { buildItinerary, seasonFromMonth } from './planner'
import type {
  Activity,
  Budget,
  Interest,
  Itinerary,
  MoneyRange,
  Pace,
  PlannerInput,
  Season,
  TransportMode,
} from './types'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const INTERESTS: { id: Interest; label: string }[] = [
  { id: 'food', label: 'Food' },
  { id: 'history', label: 'History' },
  { id: 'nature', label: 'Nature' },
  { id: 'art', label: 'Art & design' },
  { id: 'anime', label: 'Anime & games' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'wellness', label: 'Onsen & wellness' },
  { id: 'themeParks', label: 'Theme parks' },
  { id: 'photography', label: 'Photography' },
]

const INTEREST_LABELS = Object.fromEntries(INTERESTS.map((interest) => [interest.id, interest.label])) as Record<Interest, string>

const PACES: { id: Pace; label: string; detail: string }[] = [
  { id: 'local', label: 'Stay close', detail: 'Fewer bases, slower days' },
  { id: 'balanced', label: 'Balanced', detail: 'A measured regional arc' },
  { id: 'explorer', label: 'Go further', detail: 'More ground, more transfers' },
]

const BUDGETS: { id: Budget; label: string; detail: string }[] = [
  { id: 'smart', label: 'Smart', detail: 'Simple stays, local counters' },
  { id: 'comfortable', label: 'Comfort', detail: 'Private rooms, breathing room' },
  { id: 'premium', label: 'Premium', detail: 'Special stays and meals' },
]

const DEFAULT_INPUT: PlannerInput = {
  days: 7,
  travelMonth: '',
  pace: 'balanced',
  budget: 'comfortable',
  interests: ['food', 'history', 'nature'],
  willingToDrive: false,
}

const DURATION_PRESETS = [3, 7, 10, 14, 21, 30]

const SEASON_GUIDE: Record<Exclude<Season, 'any'>, { label: string; months: string; summary: string }> = {
  spring: {
    label: 'Spring in Japan',
    months: 'March–May',
    summary: 'Mild days, cool evenings, and blossoms that arrive at different times from south to north.',
  },
  summer: {
    label: 'Summer in Japan',
    months: 'June–August',
    summary: 'June often brings rain; July and August are hot and humid, with milder conditions in Hokkaido.',
  },
  autumn: {
    label: 'Autumn in Japan',
    months: 'September–November',
    summary: 'Warm early weeks give way to crisp days and foliage that gradually moves south.',
  },
  winter: {
    label: 'Winter in Japan',
    months: 'December–February',
    summary: 'Cities are often cold and dry, while Hokkaido, Tohoku, and mountain regions receive deep snow.',
  },
}

const formatJPY = ({ min, max }: MoneyRange) => `¥${min.toLocaleString()}–¥${max.toLocaleString()}`
const formatPHP = ({ min, max }: MoneyRange) => `₱${min.toLocaleString()}–₱${max.toLocaleString()}`
const duration = (minutes: number) => `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60 ? `${minutes % 60}m` : ''}`.trim()

const modeLabel: Record<TransportMode, string> = {
  train: 'Rail',
  flight: 'Flight',
  bus: 'Highway bus',
  ferry: 'Ferry',
  car: 'Rental car',
}

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const routePath = (itinerary: Itinerary | null): string => {
  const stops = itinerary?.destinations ?? []
  if (!stops.length) return ''

  return stops.slice(1).reduce((path, stop, index) => {
    const previous = stops[index]
    const dx = stop.mapX - previous.mapX
    const dy = stop.mapY - previous.mapY
    const distance = Math.max(1, Math.hypot(dx, dy))
    const bend = (index % 2 ? 1 : -1) * Math.min(18, distance * 0.16)
    const controlX = (previous.mapX + stop.mapX) / 2 - (dy / distance) * bend
    const controlY = (previous.mapY + stop.mapY) / 2 + (dx / distance) * bend
    return `${path} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${stop.mapX} ${stop.mapY}`
  }, `M ${stops[0].mapX} ${stops[0].mapY}`)
}

function JapanMap({ itinerary }: { itinerary: Itinerary | null }) {
  const path = routePath(itinerary)
  return (
    <div className="map-wrap" aria-label={itinerary ? `Map showing ${itinerary.destinations.map((item) => item.name).join(', ')}` : 'Stylized map of Japan'}>
      <svg className="japan-map" viewBox="0 0 360 590" role="img" aria-hidden="true">
        <g className="map-guides">
          <path d="M0 92H360M0 220H360M0 348H360M0 476H360" />
          <path d="M72 0V590M180 0V590M288 0V590" />
        </g>
        <circle className="map-sun" cx="304" cy="72" r="42" />
        <text className="map-ocean-label" x="16" y="34">JAPAN / 日本</text>
        <text className="map-coordinate" x="16" y="52">45°N — 24°N · Pacific arc</text>
        <g className="map-islands">
          <path className="map-land" d="M282 27c14-9 32-6 42 5l21 18-8 18 5 17-15 13-18-7-12 13-17-9-10-20 3-24z" />
          <path className="map-land" d="M267 119c11 7 18 18 18 31l-9 26-2 32-13 24-1 27-11 25-4 24-18 17-9 21-19 3-9 17-17 3-10 20-19 8-21-7 9-17 21-8 8-20 21-9 7-23 21-14 8-29 18-23 5-31 14-24-1-29z" />
          <path className="map-land" d="M126 375c13-6 30 0 37 10l-8 19-22 11-24-4-8-14 9-15z" />
          <path className="map-land" d="M75 380c14 0 27 10 26 23l-8 13 5 16-13 15-18 17-18-11 5-18-4-13 9-16-2-14z" />
          <path className="map-land" d="M27 533c8-7 19-4 25 5l-1 19-13 14-15-9-2-16z" />
          <circle className="map-islet" cx="18" cy="503" r="2.2" />
          <circle className="map-islet" cx="13" cy="482" r="1.4" />
          <circle className="map-islet" cx="106" cy="431" r="1.8" />
          <circle className="map-islet" cx="145" cy="429" r="1.4" />
        </g>
        <path className="map-contour" d="M304 43c9 11 12 25 5 39M274 137c-3 32-8 57-20 84-10 22-7 45-18 66-12 23-33 35-44 57-10 20-29 27-45 42M78 398c8 12 7 27-3 42" />
        {itinerary && (
          <>
            <path className="route-shadow" d={path} />
            <path className="route-line" d={path} />
            {itinerary.destinations.map((destination, index) => (
              <g key={destination.id} className="route-stop" style={{ '--stop-delay': `${index * 100}ms` } as React.CSSProperties}>
                <circle cx={destination.mapX} cy={destination.mapY} r="9" />
                <text className="stop-number" x={destination.mapX} y={destination.mapY + 2.8} textAnchor="middle">{index + 1}</text>
                <text className="stop-name" x={destination.mapX > 240 ? destination.mapX - 14 : destination.mapX + 14} y={destination.mapY + (index % 2 ? 16 : -10)} textAnchor={destination.mapX > 240 ? 'end' : 'start'}>
                  {destination.name}
                </text>
              </g>
            ))}
          </>
        )}
      </svg>
      {!itinerary && (
        <div className="map-placeholder">
          <span>NORTH → SOUTH</span>
          <p>A connected route, drawn to your days.</p>
        </div>
      )}
    </div>
  )
}

function ChoiceGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: { id: T; label: string; detail: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="choice-field">
      <legend>{legend}</legend>
      <div className="choice-row">
        {options.map((option) => (
          <button
            className={value === option.id ? 'choice active' : 'choice'}
            type="button"
            key={option.id}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
          >
            <strong>{option.label}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function CostList({ itinerary }: { itinerary: Itinerary }) {
  const rows: { label: string; value: MoneyRange }[] = [
    { label: 'Manila airfare', value: itinerary.costs.airfare },
    { label: 'Private-room stays', value: itinerary.costs.accommodation },
    { label: 'Food', value: itinerary.costs.food },
    { label: 'Local & intercity travel', value: itinerary.costs.localAndIntercityTransport },
    { label: 'Activities', value: itinerary.costs.activities },
  ]
  return (
    <div className="cost-list">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <strong>{formatJPY(row.value)}</strong>
        </div>
      ))}
    </div>
  )
}

function ActivityBlock({ label, activity }: { label: string; activity: Activity }) {
  const showSeparatePlace = !activity.title.toLocaleLowerCase().includes(activity.place.toLocaleLowerCase())
  return (
    <div className="activity-block">
      <span className="activity-time">{label}</span>
      <div>
        <div className="activity-heading">
          <h4>{activity.title}</h4>
          <div className="activity-tags" aria-label="Matching interests">
            {activity.interests.length
              ? activity.interests.map((interest) => <span key={interest}>{INTEREST_LABELS[interest]}</span>)
              : <span>Transfer</span>}
          </div>
        </div>
        {showSeparatePlace && <div className="activity-place"><span>Go to</span><strong>{activity.place}</strong></div>}
        {activity.recommendation && <div className="activity-recommendation"><span>Try</span><strong>{activity.recommendation}</strong></div>}
        <p>{activity.description}</p>
        <div className="activity-meta">
          <span>{activity.costJPY.max ? formatJPY(activity.costJPY) : 'No planned admission'}</span>
          <span>{activity.tip}</span>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [input, setInput] = useState<PlannerInput>(DEFAULT_INPUT)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [theme, setTheme] = useState<'editorial' | 'neon'>('editorial')
  const resultsRef = useRef<HTMLElement>(null)
  const routePreview = useMemo(() => itinerary, [itinerary])
  const selectedSeason = seasonFromMonth(input.travelMonth)
  const seasonGuide = selectedSeason === 'any' ? null : SEASON_GUIDE[selectedSeason]

  const update = <K extends keyof PlannerInput>(key: K, value: PlannerInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }))
  }

  const toggleInterest = (interest: Interest) => {
    setInput((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }))
  }

  const generate = (event: FormEvent) => {
    event.preventDefault()
    setItinerary(buildItinerary(input))
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const reset = () => {
    setInput(DEFAULT_INPUT)
    setItinerary(null)
    document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className={`theme-${theme}`}>
      <section className="hero" style={{ backgroundImage: `url(${asset(theme === 'neon' ? '/images/tokyo-evening.webp' : '/images/hero-journey.webp')})` }}>
        <nav className="hero-nav" aria-label="Main navigation">
          <a className="wordmark" href="#top" aria-label="Japan, By Days home">
            <span>日本</span> Japan, By Days
          </a>
          <div className="nav-actions">
            <button
              className="theme-toggle"
              type="button"
              aria-pressed={theme === 'neon'}
              aria-label={theme === 'neon' ? 'Switch to paper daylight theme' : 'Switch to city neon theme'}
              onClick={() => setTheme((current) => current === 'neon' ? 'editorial' : 'neon')}
            >
              <span className="theme-light" aria-hidden="true" />
              <span className="theme-label">{theme === 'neon' ? 'Paper daylight' : 'City neon'}</span>
            </button>
            <a className="nav-link" href="#planner">Build your route <Arrow /></a>
          </div>
        </nav>
        <div className="hero-content" id="top">
          <p className="eyebrow light">Manila → Japan · 3–30 days</p>
          <h1><span>Japan, By Days.</span><br />Make every transfer count.</h1>
          <p className="hero-copy">Tell us what pulls you in and how far you want to roam. Leave with a route that respects your time and budget.</p>
          <a className="primary-cta light-cta" href="#planner">Begin with seven days <Arrow /></a>
        </div>
        <div className="hero-index" aria-hidden="true">
          <span>35.6762° N</span>
          <span>139.6503° E</span>
        </div>
      </section>

      <section className="thesis section-pad" aria-labelledby="thesis-title">
        <div className="section-number">01 / The idea</div>
        <div>
          <p className="eyebrow">Distance follows duration</p>
          <h2 id="thesis-title">A great Japan trip is not a list. It is a rhythm.</h2>
        </div>
        <p className="thesis-copy">Three days should feel deep, not rushed. A month should open the whole archipelago. We shape the distance, then fill each stop with your interests.</p>
      </section>

      <section className="editorial-strip" aria-label="Japan travel moments">
        <figure className="photo">
          <img src={asset('/images/tokyo-evening.webp')} alt="Two travelers walking through a quiet Tokyo lane after rain" />
          <figcaption><span>Tokyo</span><small>City detail, after rain</small></figcaption>
        </figure>
        <figure className="photo">
          <img src={asset('/images/kyoto-morning.webp')} alt="A traveler approaching a quiet Kyoto temple gate" />
          <figcaption><span>Kyoto</span><small>First light, before the crowds</small></figcaption>
        </figure>
        <figure className="photo">
          <img src={asset('/images/hokkaido-road.webp')} alt="A road through Hokkaido fields toward a mountain" />
          <figcaption><span>Hokkaido</span><small>More days, wider horizons</small></figcaption>
        </figure>
      </section>

      <section className="planner section-pad" id="planner" aria-labelledby="planner-title">
        <div className="planner-heading">
          <div className="section-number">02 / Your route</div>
          <div>
            <p className="eyebrow">Six considered choices</p>
            <h2 id="planner-title">How do you want Japan to feel?</h2>
          </div>
        </div>

        <div className="planner-grid">
          <form className="planner-form" onSubmit={generate}>
            <fieldset className="duration-field">
              <legend>How many days do you have?</legend>
              <div className="duration-display"><strong>{input.days}</strong><span>days</span></div>
              <input
                type="range"
                min="3"
                max="30"
                value={input.days}
                onChange={(event) => update('days', Number(event.target.value))}
                aria-label="Trip duration in days"
              />
              <div className="duration-presets" aria-label="Common trip durations">
                {DURATION_PRESETS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    className={input.days === days ? 'active' : ''}
                    style={{ '--preset-position': `${((days - 3) / 27) * 100}%` } as React.CSSProperties}
                    onClick={() => update('days', days)}
                  >{days}</button>
                ))}
              </div>
            </fieldset>

            <div className="month-field">
              <label htmlFor="travel-month">Travel month <span>Optional</span></label>
              <input id="travel-month" type="month" value={input.travelMonth} onInput={(event) => update('travelMonth', event.currentTarget.value)} />
              {seasonGuide ? (
                <div className="season-note" role="status" aria-live="polite">
                  <div>
                    <span>Season</span>
                    <strong>{seasonGuide.label}</strong>
                    <small>{seasonGuide.months}</small>
                  </div>
                  <p>{seasonGuide.summary}</p>
                </div>
              ) : (
                <p>Choose a month to see the season and tailor seasonal activities.</p>
              )}
            </div>

            <ChoiceGroup legend="How far should the route reach?" options={PACES} value={input.pace} onChange={(value) => update('pace', value)} />

            <fieldset className="interest-field">
              <legend>What pulls you in?</legend>
              <div className="interest-grid">
                {INTERESTS.map((interest) => (
                  <button
                    type="button"
                    key={interest.id}
                    className={input.interests.includes(interest.id) ? 'interest active' : 'interest'}
                    onClick={() => toggleInterest(interest.id)}
                    aria-pressed={input.interests.includes(interest.id)}
                  >
                    <span aria-hidden="true">{input.interests.includes(interest.id) ? '●' : '○'}</span>{interest.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <ChoiceGroup legend="Choose a comfort level" options={BUDGETS} value={input.budget} onChange={(value) => update('budget', value)} />

            <label className="drive-toggle">
              <input type="checkbox" checked={input.willingToDrive} onChange={(event) => update('willingToDrive', event.target.checked)} />
              <span className="toggle-ui" aria-hidden="true" />
              <span><strong>I am open to driving</strong><small>Useful in Hokkaido and rural Kyushu. Japan requires the correct International Driving Permit.</small></span>
            </label>

            <button className="generate-button" type="submit">
              Trace my Japan <Arrow />
            </button>
            <p className="form-note">No account. No live fare scraping. Just a clear planning baseline.</p>
          </form>

          <aside className="planner-map">
            <JapanMap itinerary={routePreview} />
            <div className="map-caption">
              <span>{itinerary ? itinerary.routeName : 'Your map is waiting'}</span>
              <p>{itinerary ? itinerary.destinations.map((destination) => destination.name).join(' · ') : 'Generate a route to see how your days translate into distance.'}</p>
            </div>
          </aside>
        </div>
      </section>

      {itinerary && (
        <section className="results" ref={resultsRef} aria-labelledby="results-title">
          <div className="results-intro section-pad">
            <div className="section-number light-number">03 / Your itinerary</div>
            <div className="results-title-block">
              <p className="eyebrow light">Route #{itinerary.id.toUpperCase()}</p>
              <h2 id="results-title">{itinerary.title}</h2>
              <p>{itinerary.summary}</p>
            </div>
            <div className="total-cost">
              <span>Complete trip estimate</span>
              <strong>{formatPHP(itinerary.costs.totalPHP)}</strong>
              <small>{formatJPY(itinerary.costs.totalJPY)} per person</small>
            </div>
          </div>

          <div className="route-overview section-pad">
            <div className="route-map-dark">
              <JapanMap itinerary={itinerary} />
            </div>
            <div className="route-details">
              <p className="eyebrow light">The route</p>
              <ol className="route-list">
                {itinerary.destinations.map((destination, index) => (
                  <li key={destination.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div><strong>{destination.name}</strong><small>{destination.region}</small></div>
                  </li>
                ))}
              </ol>
              <div className="pass-note"><span>Rail check</span><p>{itinerary.railPassNote}</p></div>
            </div>
            <div className="cost-panel">
              <p className="eyebrow light">Planning range</p>
              <CostList itinerary={itinerary} />
              <div className="cost-total-line"><span>Total</span><strong>{formatJPY(itinerary.costs.totalJPY)}</strong></div>
              <small>≈ {formatPHP(itinerary.costs.totalPHP)} at ¥1 = ₱{JPY_TO_PHP_RATE}, dated {RATE_VERIFIED_ON}.</small>
            </div>
          </div>

          <div className="day-plan section-pad">
            <div className="day-plan-heading">
              <div>
                <p className="eyebrow light">Day by day</p>
                <h3>Enough structure.<br />Room to wander.</h3>
              </div>
              <p>Transfers appear once, on arrival days. All other blocks are distinct within each stop.</p>
            </div>
            <div className="days">
              {itinerary.days.map((day, index) => (
                <details key={day.day} open={index === 0}>
                  <summary onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.currentTarget.parentElement?.toggleAttribute('open')
                    }
                  }}>
                    <span className="day-number">Day {String(day.day).padStart(2, '0')}</span>
                    <div><strong>{day.destination.name}</strong><small>{day.destination.region}</small></div>
                    {day.transfer && <span className="transfer-chip">{modeLabel[day.transfer.mode]} · {duration(day.transfer.durationMinutes)}</span>}
                    <span className="summary-mark" aria-hidden="true">+</span>
                  </summary>
                  <div className="day-content">
                    <div className="day-intro">
                      <span>{day.destination.region} base</span>
                      <h4>{day.destination.name}</h4>
                      <p>{day.destination.tagline}</p>
                    </div>
                    <div className="activities">
                      <ActivityBlock label="Morning" activity={day.morning} />
                      <ActivityBlock label="Afternoon" activity={day.afternoon} />
                      <ActivityBlock label="Evening" activity={day.evening} />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="results-actions section-pad">
            <button className="secondary-button" type="button" onClick={() => document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })}>Edit these choices</button>
            <button className="text-button" type="button" onClick={reset}>Start over <Arrow /></button>
          </div>
        </section>
      )}

      <section className="notes section-pad" aria-labelledby="notes-title">
        <div className="section-number">04 / Before booking</div>
        <div>
          <p className="eyebrow">A useful estimate, not a quote</p>
          <h2 id="notes-title">Travel changes. Your plan should say what it knows.</h2>
        </div>
        <div className="notes-copy">
          <p>Ranges include one traveler, a private room, Manila round-trip airfare, food, activities, and domestic transport. Shopping, insurance, visas, and disruption costs are excluded.</p>
          <p>Verify live fares, timetables, attraction hours, road rules, and pass eligibility before purchase.</p>
          <ul>
            {SOURCES.map((source) => (
              <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a><span>Checked {source.verifiedOn}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <footer>
        <div className="wordmark"><span>日本</span> Japan, By Days</div>
        <p>Go as far as your days allow.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  )
}

export default App
