import { useMemo, useRef, useState, type FormEvent } from 'react'
import { JPY_TO_PHP_RATE, RATE_VERIFIED_ON, SOURCES } from './data'
import { buildItinerary } from './planner'
import type {
  Activity,
  Budget,
  Interest,
  Itinerary,
  MoneyRange,
  Pace,
  PlannerInput,
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

function JapanMap({ itinerary }: { itinerary: Itinerary | null }) {
  const points = itinerary?.destinations.map((destination) => `${destination.mapX},${destination.mapY}`).join(' ') ?? ''
  return (
    <div className="map-wrap" aria-label={itinerary ? `Map showing ${itinerary.destinations.map((item) => item.name).join(', ')}` : 'Stylized map of Japan'}>
      <svg className="japan-map" viewBox="0 0 360 590" role="img" aria-hidden="true">
        <path className="map-land" d="M300 26l28 15 15 29-9 30-35 15-28-17-2-35zM265 119l20 9 3 25-12 23-11 31-16 21-5 33-18 25-9 35-18 25-15 31-17 16-6 28-22 20-20-7 5-25 19-18 5-28 18-23 13-31 15-22 8-30 19-20 7-29 17-25zM130 370l27 13-5 27-24 21-28-2-15-19 14-27zM78 391l19 7-1 22-17 21-22-11 2-25zM36 525l16 9 1 25-17 12-14-15 2-20z" />
        <path className="map-contour" d="M309 54c-4 18-10 35-25 46M272 139c-9 41-32 75-41 118-8 36-28 71-48 100-18 27-25 51-57 61" />
        {itinerary && (
          <>
            <polyline className="route-shadow" points={points} />
            <polyline className="route-line" points={points} />
            {itinerary.destinations.map((destination, index) => (
              <g key={destination.id} className="route-stop" style={{ '--stop-delay': `${index * 100}ms` } as React.CSSProperties}>
                <circle cx={destination.mapX} cy={destination.mapY} r="7" />
                <circle cx={destination.mapX} cy={destination.mapY} r="2.5" />
                <text x={destination.mapX > 240 ? destination.mapX - 12 : destination.mapX + 12} y={destination.mapY + 4} textAnchor={destination.mapX > 240 ? 'end' : 'start'}>
                  {destination.name}
                </text>
              </g>
            ))}
          </>
        )}
      </svg>
      {!itinerary && (
        <div className="map-placeholder">
          <span>01 — 09</span>
          <p>Your route will trace itself here.</p>
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
  return (
    <div className="activity-block">
      <span className="activity-time">{label}</span>
      <div>
        <h4>{activity.title}</h4>
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
  const resultsRef = useRef<HTMLElement>(null)
  const routePreview = useMemo(() => itinerary, [itinerary])

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
    <main>
      <section className="hero" style={{ backgroundImage: `url(${asset('/images/hero-journey.webp')})` }}>
        <nav className="hero-nav" aria-label="Main navigation">
          <a className="wordmark" href="#top" aria-label="Japan, By Days home">
            <span>日本</span> Japan, By Days
          </a>
          <a className="nav-link" href="#planner">Build your route <Arrow /></a>
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
        <figure className="photo photo-tall">
          <img src={asset('/images/tokyo-evening.webp')} alt="Two travelers walking through a quiet Tokyo lane after rain" />
          <figcaption><span>Tokyo</span><small>City detail, after rain</small></figcaption>
        </figure>
        <figure className="photo photo-offset">
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
                {[3, 7, 10, 14, 21, 30].map((days) => (
                  <button key={days} type="button" className={input.days === days ? 'active' : ''} onClick={() => update('days', days)}>{days}</button>
                ))}
              </div>
            </fieldset>

            <div className="month-field">
              <label htmlFor="travel-month">Travel month <span>Optional</span></label>
              <input id="travel-month" type="month" value={input.travelMonth} onChange={(event) => update('travelMonth', event.target.value)} />
              <p>Used for seasonal activities—not a weather forecast.</p>
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
                    <div className="day-image">
                      <img src={asset(day.destination.image)} alt={day.destination.imageAlt} />
                      <span>{day.destination.tagline}</span>
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
