import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { JPY_TO_PHP_RATE, RATE_VERIFIED_ON, SOURCES } from './data'
import {
  buildItineraryOptions,
  DEFAULT_PLANNER_INPUT,
  plannerInputFromSearchParams,
  plannerInputToSearchParams,
  seasonFromMonth,
} from './planner'
import type {
  Activity,
  Budget,
  FlightGateway,
  Gateway,
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

const GATEWAYS: { id: Gateway; label: string }[] = [
  { id: 'auto', label: 'Recommend for me' },
  { id: 'tokyo', label: 'Tokyo · HND / NRT' },
  { id: 'osaka', label: 'Osaka · KIX' },
  { id: 'fukuoka', label: 'Fukuoka · FUK' },
  { id: 'sapporo', label: 'Sapporo · CTS' },
  { id: 'naha', label: 'Okinawa · OKA' },
]

const GATEWAY_LABELS: Record<FlightGateway, string> = {
  tokyo: 'Tokyo',
  osaka: 'Osaka',
  fukuoka: 'Fukuoka',
  sapporo: 'Sapporo',
  naha: 'Okinawa',
}

const DURATION_PRESETS = [3, 7, 10, 14, 21, 30]

const SEASON_GUIDE: Record<Exclude<Season, 'any'>, { label: string; months: string; summary: string }> = {
  spring: { label: 'Spring in Japan', months: 'March–May', summary: 'Mild days, cool evenings, and blossoms that arrive at different times from south to north.' },
  summer: { label: 'Summer in Japan', months: 'June–August', summary: 'June often brings rain; July and August are hot and humid, with milder conditions in Hokkaido.' },
  autumn: { label: 'Autumn in Japan', months: 'September–November', summary: 'Warm early weeks give way to crisp days and foliage that gradually moves south.' },
  winter: { label: 'Winter in Japan', months: 'December–February', summary: 'Cities are often cold and dry, while Hokkaido, Tohoku, and mountain regions receive deep snow.' },
}

const PREP_ITEMS = [
  { label: 'Check passport and current visa requirements early.', link: 'https://www.ph.emb-japan.go.jp/itpr_en/00_000035.html', linkLabel: 'Embassy guidance' },
  { label: 'Complete arrival procedures and keep the QR codes available offline.', link: 'https://www.vjw.digital.go.jp/', linkLabel: 'Visit Japan Web' },
  { label: 'Choose an IC transit card and plan a small cash reserve.', link: 'https://www.japan.travel/en/plan/ic-card/', linkLabel: 'IC card guide' },
  { label: 'Decide where to forward or store luggage on transfer days.', link: 'https://www.japan.travel/en/plan/getting-around/luggage-storage/', linkLabel: 'Luggage guide' },
  { label: 'Save emergency numbers, insurance details, and passport copies.', link: 'https://www.japan.travel/en/plan/emergencies/', linkLabel: 'Safety guidance' },
]

const formatJPY = ({ min, max }: MoneyRange) => `¥${min.toLocaleString()}–¥${max.toLocaleString()}`
const formatPHP = ({ min, max }: MoneyRange) => `₱${min.toLocaleString()}–₱${max.toLocaleString()}`
const duration = (minutes: number) => `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60 ? `${minutes % 60}m` : ''}`.trim()
const mapsSearchUrl = (place: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Japan`)}`
const mapsRouteUrl = (from: string, to: string) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${from}, Japan`)}&destination=${encodeURIComponent(`${to}, Japan`)}&travelmode=transit`

const bookingLabel: Record<Activity['bookingAdvice'], string> = {
  'walk-in': 'Usually flexible',
  'check-ahead': 'Check hours / booking',
  reserve: 'Reserve ahead',
}

const modeLabel: Record<TransportMode, string> = {
  train: 'Rail',
  flight: 'Flight',
  bus: 'Highway bus',
  ferry: 'Ferry',
  car: 'Rental car',
}

const dayDate = (startDate: string, day: number): string | null => {
  if (!startDate) return null
  const value = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(value.getTime())) return null
  value.setDate(value.getDate() + day - 1)
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', weekday: 'short' }).format(value)
}

const currentTripDay = (startDate: string, totalDays: number): number => {
  if (!startDate) return 0
  const start = new Date(`${startDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const index = Math.floor((today.getTime() - start.getTime()) / 86_400_000)
  return index >= 0 && index < totalDays ? index : 0
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
              <g key={destination.id} className="route-stop" style={{ '--stop-delay': `${index * 100}ms` } as CSSProperties}>
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
    </div>
  )
}

function ChoiceGroup<T extends string>({ legend, options, value, onChange }: {
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
          <button className={value === option.id ? 'choice active' : 'choice'} type="button" key={option.id} onClick={() => onChange(option.id)} aria-pressed={value === option.id}>
            <strong>{option.label}</strong>
            <span>{option.detail}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function CostList({ itinerary, rooms }: { itinerary: Itinerary; rooms: number }) {
  const rows: { label: string; value: MoneyRange }[] = [
    { label: 'Manila airfare', value: itinerary.costs.airfare },
    { label: `${rooms} room${rooms === 1 ? '' : 's'} · your share`, value: itinerary.costs.accommodation },
    { label: 'Food', value: itinerary.costs.food },
    { label: 'Local & intercity travel', value: itinerary.costs.localAndIntercityTransport },
    { label: 'Activities', value: itinerary.costs.activities },
  ]
  return (
    <div className="cost-list">
      {rows.map((row) => <div key={row.label}><span>{row.label}</span><strong>{formatJPY(row.value)}</strong></div>)}
    </div>
  )
}

function ActivityBlock({ label, activity, nextActivity }: { label: string; activity: Activity; nextActivity?: Activity }) {
  const showSeparatePlace = !activity.title.toLocaleLowerCase().includes(activity.place.toLocaleLowerCase())
  const isTransfer = activity.id.startsWith('transfer-')
  return (
    <div className="activity-block">
      <span className="activity-time">{label}</span>
      <div>
        <div className="activity-heading">
          <h4>{activity.title}</h4>
          <div className="activity-tags" aria-label="Matching interests">
            {activity.interests.length ? activity.interests.map((interest) => <span key={interest}>{INTEREST_LABELS[interest]}</span>) : <span>Transfer</span>}
          </div>
        </div>
        {showSeparatePlace && <div className="activity-place"><span>Go to</span><strong>{activity.place}</strong></div>}
        {activity.recommendation && <div className="activity-recommendation"><span>Try</span><strong>{activity.recommendation}</strong></div>}
        <p>{activity.description}</p>
        <div className="activity-logistics">
          <span>{duration(activity.durationMinutes)}</span>
          <span>{bookingLabel[activity.bookingAdvice]}</span>
          {!isTransfer && <a href={mapsSearchUrl(activity.place)} target="_blank" rel="noopener noreferrer">Open in Maps ↗</a>}
          {nextActivity && !isTransfer && <a href={mapsRouteUrl(activity.place, nextActivity.place)} target="_blank" rel="noopener noreferrer">Route to next stop ↗</a>}
        </div>
        <div className="activity-meta">
          <span>{activity.costJPY.max ? formatJPY(activity.costJPY) : 'No planned admission'}</span>
          <span>{activity.tip}</span>
        </div>
        {activity.rainAlternative && <details className="weather-backup"><summary>Wet-weather backup</summary><p>{activity.rainAlternative}</p></details>}
      </div>
    </div>
  )
}

const loadInitialPlan = (): { input: PlannerInput; options: Itinerary[]; itinerary: Itinerary | null } => {
  const input = plannerInputFromSearchParams(new URLSearchParams(window.location.search)) ?? DEFAULT_PLANNER_INPUT
  if (!new URLSearchParams(window.location.search).has('plan')) return { input, options: [], itinerary: null }
  try {
    const options = buildItineraryOptions(input)
    const selectedId = new URLSearchParams(window.location.search).get('route')
    return { input, options, itinerary: options.find((option) => option.id === selectedId) ?? options[0] }
  } catch {
    return { input, options: [], itinerary: null }
  }
}

function App() {
  const [initial] = useState(loadInitialPlan)
  const [input, setInput] = useState<PlannerInput>(initial.input)
  const [planInput, setPlanInput] = useState<PlannerInput>(initial.input)
  const [itineraryOptions, setItineraryOptions] = useState<Itinerary[]>(initial.options)
  const [itinerary, setItinerary] = useState<Itinerary | null>(initial.itinerary)
  const [theme, setTheme] = useState<'editorial' | 'neon'>('editorial')
  const [activeDay, setActiveDay] = useState(() => currentTripDay(initial.input.startDate, initial.itinerary?.days.length ?? initial.input.days))
  const [dayView, setDayView] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [error, setError] = useState('')
  const resultsRef = useRef<HTMLElement>(null)
  const selectedSeason = seasonFromMonth(input.startDate.slice(0, 7) || input.travelMonth)
  const seasonGuide = selectedSeason === 'any' ? null : SEASON_GUIDE[selectedSeason]
  const routePreview = useMemo(() => {
    try { return buildItineraryOptions(input)[0] } catch { return null }
  }, [input])

  const update = <K extends keyof PlannerInput>(key: K, value: PlannerInput[K]) => setInput((current) => ({ ...current, [key]: value }))

  const toggleInterest = (interest: Interest) => setInput((current) => ({
    ...current,
    interests: current.interests.includes(interest) ? current.interests.filter((item) => item !== interest) : [...current.interests, interest],
  }))

  const writePlanUrl = (planInput: PlannerInput, selected?: Itinerary) => {
    const params = plannerInputToSearchParams(planInput, selected?.id)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${selected ? '#results' : ''}`)
  }

  const generate = (event: FormEvent) => {
    event.preventDefault()
    try {
      const options = buildItineraryOptions(input)
      setItineraryOptions(options)
      setItinerary(options[0])
      setPlanInput(input)
      setActiveDay(currentTripDay(input.startDate, options[0].days.length))
      setDayView(false)
      setError('')
      setShareStatus('')
      writePlanUrl(input, options[0])
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No connected route fits these choices.')
    }
  }

  const chooseRoute = (option: Itinerary) => {
    setItinerary(option)
    setActiveDay(currentTripDay(planInput.startDate, option.days.length))
    writePlanUrl(planInput, option)
  }

  const copyPlan = async () => {
    if (!itinerary) return
    writePlanUrl(planInput, itinerary)
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareStatus('Plan link copied')
    } catch {
      setShareStatus('Plan is in the address bar—copy the URL to share it')
    }
  }

  const printPlan = () => {
    const details = [...document.querySelectorAll<HTMLDetailsElement>('.days details')]
    const open = details.map((item) => item.open)
    details.forEach((item) => { item.open = true })
    window.print()
    details.forEach((item, index) => { item.open = open[index] })
  }

  const reset = () => {
    setInput(DEFAULT_PLANNER_INPUT)
    setPlanInput(DEFAULT_PLANNER_INPUT)
    setItineraryOptions([])
    setItinerary(null)
    setDayView(false)
    setShareStatus('')
    window.history.replaceState(null, '', window.location.pathname)
    document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })
  }

  const visibleDays = itinerary ? (dayView ? [itinerary.days[activeDay]] : itinerary.days) : []

  return (
    <main className={`theme-${theme}`}>
      <section className="hero" id="top" style={{ backgroundImage: `url(${asset(theme === 'neon' ? '/images/tokyo-evening.webp' : '/images/hero-journey.webp')})` }}>
        <nav className="hero-nav" aria-label="Main navigation">
          <a className="wordmark" href="#top" aria-label="Japan, By Days home"><span>日本</span> Japan, By Days</a>
          <a className="nav-link" href={itinerary ? '#results' : '#planner'}>{itinerary ? 'View your plan' : 'Build your route'} <Arrow /></a>
        </nav>
        <div className="hero-content">
          <p className="eyebrow light">Manila → Japan · 3–30 days</p>
          <h1><span>Japan, By Days.</span><br />Make every transfer count.</h1>
          <p className="hero-copy">Tell us what pulls you in and how far you want to roam. Leave with a route that respects your time and budget.</p>
          <a className="primary-cta light-cta" href="#planner">Begin with seven days <Arrow /></a>
        </div>
        <div className="hero-index" aria-hidden="true"><span>35.6762° N</span><span>139.6503° E</span></div>
      </section>

      <section className="thesis section-pad" aria-labelledby="thesis-title">
        <div className="section-number">01 / The idea</div>
        <div><p className="eyebrow">Distance follows duration</p><h2 id="thesis-title">A great Japan trip is not a list. It is a rhythm.</h2></div>
        <p className="thesis-copy">Three days should feel deep, not rushed. A month should open the whole archipelago. We shape the distance, then fill each stop with your interests.</p>
      </section>

      <section className="editorial-strip" aria-label="Japan travel moments">
        <figure className="photo"><img src={asset('/images/tokyo-evening.webp')} alt="Two travelers walking through a quiet Tokyo lane after rain" /><figcaption><span>Tokyo</span><small>City detail, after rain</small></figcaption></figure>
        <figure className="photo"><img src={asset('/images/kyoto-morning.webp')} alt="A traveler approaching a quiet Kyoto temple gate" /><figcaption><span>Kyoto</span><small>First light, before the crowds</small></figcaption></figure>
        <figure className="photo"><img src={asset('/images/hokkaido-road.webp')} alt="A road through Hokkaido fields toward a mountain" /><figcaption><span>Hokkaido</span><small>More days, wider horizons</small></figcaption></figure>
      </section>

      <section className="planner section-pad" id="planner" aria-labelledby="planner-title">
        <div className="planner-heading">
          <div className="section-number">02 / Your route</div>
          <div><p className="eyebrow">Trip shape, not a quiz</p><h2 id="planner-title">Build the trip you can actually take.</h2></div>
        </div>

        <div className="planner-grid">
          <form className="planner-form" onSubmit={generate}>
            <fieldset className="duration-field">
              <legend>How many days do you have?</legend>
              <div className="duration-display"><strong>{input.days}</strong><span>days</span></div>
              <input type="range" min="3" max="30" value={input.days} onChange={(event) => update('days', Number(event.target.value))} aria-label="Trip duration in days" />
              <div className="duration-presets" aria-label="Common trip durations">
                {DURATION_PRESETS.map((days) => <button key={days} type="button" className={input.days === days ? 'active' : ''} style={{ '--preset-position': `${((days - 3) / 27) * 100}%` } as CSSProperties} onClick={() => update('days', days)}>{days}</button>)}
              </div>
            </fieldset>

            <div className="trip-basics">
              <div className="month-field">
                <label htmlFor="start-date">Trip start date <span>Optional</span></label>
                <input id="start-date" type="date" value={input.startDate} onInput={(event) => setInput((current) => ({ ...current, startDate: event.currentTarget.value, travelMonth: event.currentTarget.value.slice(0, 7) }))} />
                {seasonGuide ? <div className="season-note" role="status" aria-live="polite"><div><span>Season</span><strong>{seasonGuide.label}</strong><small>{seasonGuide.months}</small></div><p>{seasonGuide.summary}</p></div> : <p>Choose a date to label every day and tailor seasonal activities.</p>}
              </div>
              <fieldset className="party-field">
                <legend>Who is travelling?</legend>
                <div className="number-fields">
                  <label>Travellers<input type="number" min="1" max="8" value={input.travellers} onChange={(event) => setInput((current) => { const travellers = Math.max(1, Number(event.target.value) || 1); return { ...current, travellers, rooms: Math.min(current.rooms, travellers) } })} /></label>
                  <label>Rooms<input type="number" min="1" max={input.travellers} value={input.rooms} onChange={(event) => update('rooms', Math.max(1, Number(event.target.value) || 1))} /></label>
                </div>
                <p>Accommodation is shared across the rooms; other estimates scale per traveller.</p>
              </fieldset>
            </div>

            <fieldset className="gateway-field">
              <legend>Where should the international flights connect?</legend>
              <div className="gateway-grid">
                <label>Arrive through<select value={input.arrivalGateway} onChange={(event) => update('arrivalGateway', event.target.value as Gateway)}>{GATEWAYS.map((gateway) => <option key={gateway.id} value={gateway.id}>{gateway.label}</option>)}</select></label>
                <label>Depart through<select value={input.departureGateway} onChange={(event) => update('departureGateway', event.target.value as Gateway)}>{GATEWAYS.map((gateway) => <option key={gateway.id} value={gateway.id}>{gateway.label}</option>)}</select></label>
              </div>
              <p>Automatic gateways favor a connected route; explicit choices can create an open-jaw trip.</p>
            </fieldset>

            <ChoiceGroup legend="How far should the route reach?" options={PACES} value={input.pace} onChange={(value) => update('pace', value)} />

            <fieldset className="interest-field">
              <legend>What pulls you in?</legend>
              <div className="interest-grid">
                {INTERESTS.map((interest) => <button type="button" key={interest.id} className={input.interests.includes(interest.id) ? 'interest active' : 'interest'} onClick={() => toggleInterest(interest.id)} aria-pressed={input.interests.includes(interest.id)}><span aria-hidden="true">{input.interests.includes(interest.id) ? '●' : '○'}</span>{interest.label}</button>)}
              </div>
            </fieldset>

            <ChoiceGroup legend="Choose a comfort level" options={BUDGETS} value={input.budget} onChange={(value) => update('budget', value)} />

            <label className="drive-toggle">
              <input type="checkbox" checked={input.willingToDrive} onChange={(event) => update('willingToDrive', event.target.checked)} />
              <span className="toggle-ui" aria-hidden="true" />
              <span><strong>I am open to driving</strong><small>Useful in Hokkaido and rural Kyushu. Japan requires the correct International Driving Permit.</small></span>
            </label>

            <button className="generate-button" type="submit">Compare my routes <Arrow /></button>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="form-note">No account or live fare scraping. Your choices stay in the shareable URL.</p>
          </form>

          <aside className="planner-map">
            <JapanMap itinerary={routePreview} />
            <div className="map-caption"><span>{routePreview?.routeName ?? 'Live route preview'}</span><p>{routePreview ? routePreview.destinations.map((destination) => destination.name).join(' · ') : 'Adjust your choices to preview a connected route.'}</p></div>
          </aside>
        </div>
      </section>

      {itinerary && (
        <section className="results" id="results" ref={resultsRef} aria-labelledby="results-title">
          <div className="results-intro section-pad">
            <div className="section-number light-number">03 / Your itinerary</div>
            <div className="results-title-block"><p className="eyebrow light">Route #{itinerary.id.toUpperCase()}</p><h2 id="results-title">{itinerary.title}</h2><p>{itinerary.summary}</p></div>
            <div className="total-cost"><span>{planInput.travellers > 1 ? `Estimate for ${planInput.travellers} travellers` : 'Complete trip estimate'}</span><strong>{formatPHP(planInput.travellers > 1 ? itinerary.costs.groupTotalPHP : itinerary.costs.totalPHP)}</strong><small>{formatJPY(planInput.travellers > 1 ? itinerary.costs.groupTotalJPY : itinerary.costs.totalJPY)} {planInput.travellers > 1 ? 'for the group' : 'per person'}</small></div>
          </div>

          <div className="route-chooser section-pad" aria-labelledby="route-choice-title">
            <div><p className="eyebrow light">Compare before committing</p><h3 id="route-choice-title">{itineraryOptions.length === 1 ? 'One connected route for these constraints.' : `${itineraryOptions.length} viable shapes for the same trip.`}</h3></div>
            <div className="route-options">
              {itineraryOptions.map((option, index) => (
                <button key={option.id} type="button" className={option.id === itinerary.id ? 'route-option active' : 'route-option'} onClick={() => chooseRoute(option)} aria-pressed={option.id === itinerary.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{option.routeName}</strong><p>{option.fitReason}</p><small>{option.destinations.length} bases · {duration(option.transferMinutes)} transfers · {GATEWAY_LABELS[option.arrivalGateway]} in / {GATEWAY_LABELS[option.departureGateway]} out</small></div>
                  <b>{formatPHP(planInput.travellers > 1 ? option.costs.groupTotalPHP : option.costs.totalPHP)}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="results-toolbar section-pad" aria-label="Plan actions">
            <button type="button" onClick={() => document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })}>Modify choices</button>
            <button type="button" onClick={copyPlan}>Copy plan link</button>
            <button type="button" onClick={printPlan}>Print / save PDF</button>
            <button type="button" className={dayView ? 'active' : ''} onClick={() => setDayView((current) => !current)}>{dayView ? 'Show full plan' : 'Open day view'}</button>
            {shareStatus && <span role="status">{shareStatus}</span>}
          </div>

          <div className="route-overview section-pad">
            <div className="route-map-dark"><JapanMap itinerary={itinerary} /></div>
            <div className="route-details">
              <p className="eyebrow light">The route</p>
              <ol className="route-list">
                {itinerary.destinations.map((destination, index) => {
                  const stay = itinerary.stays[index]
                  return <li key={destination.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{destination.name}</strong><small>{destination.region} · {stay.nights} night{stay.nights === 1 ? '' : 's'}</small></div></li>
                })}
              </ol>
              <div className="gateway-note"><span>Flight shape</span><p>{GATEWAY_LABELS[itinerary.arrivalGateway]} arrival · {GATEWAY_LABELS[itinerary.departureGateway]} departure. {itinerary.airfareNote}</p></div>
              <div className="pass-note"><span>Rail check</span><p>{itinerary.railPassNote}</p></div>
            </div>
            <div className="cost-panel">
              <p className="eyebrow light">Per-person planning range</p>
              <CostList itinerary={itinerary} rooms={planInput.rooms} />
              <div className="cost-total-line"><span>Per person</span><strong>{formatJPY(itinerary.costs.totalJPY)}</strong></div>
              {planInput.travellers > 1 && <div className="cost-total-line group-total"><span>Whole party</span><strong>{formatJPY(itinerary.costs.groupTotalJPY)}</strong></div>}
              <small>≈ {formatPHP(itinerary.costs.totalPHP)} per person at ¥1 = ₱{JPY_TO_PHP_RATE}, dated {RATE_VERIFIED_ON}.</small>
            </div>
          </div>

          <div className={`day-plan section-pad ${dayView ? 'day-view' : ''}`}>
            <div className="day-plan-heading">
              <div><p className="eyebrow light">{dayView ? 'Day view' : 'Day by day'}</p><h3>{dayView ? `Day ${activeDay + 1}` : <>Enough structure.<br />Room to wander.</>}</h3></div>
              <p>{dayView ? 'Keep the current day, addresses, timing, and next move in one compact view.' : 'Transfers appear once, on arrival days. Activities include timing, booking guidance, map links, and wet-weather backups.'}</p>
            </div>
            {dayView && (
              <div className="day-view-nav" aria-label="Choose itinerary day">
                <button type="button" onClick={() => setActiveDay((day) => Math.max(0, day - 1))} disabled={activeDay === 0}>← Previous</button>
                <label>Day<select value={activeDay} onChange={(event) => setActiveDay(Number(event.target.value))}>{itinerary.days.map((day, index) => <option key={day.day} value={index}>Day {day.day}{dayDate(planInput.startDate, day.day) ? ` · ${dayDate(planInput.startDate, day.day)}` : ''} · {day.destination.name}</option>)}</select></label>
                <button type="button" onClick={() => setActiveDay((day) => Math.min(itinerary.days.length - 1, day + 1))} disabled={activeDay === itinerary.days.length - 1}>Next →</button>
              </div>
            )}
            <div className="days">
              {visibleDays.map((day, index) => (
                <details key={day.day} open={dayView || index === 0}>
                  <summary>
                    <span className="day-number">Day {String(day.day).padStart(2, '0')}</span>
                    <div><strong>{day.destination.name}</strong><small>{dayDate(planInput.startDate, day.day) ?? day.destination.region}</small></div>
                    {day.transfer && <span className="transfer-chip">{modeLabel[day.transfer.mode]} · {duration(day.transfer.durationMinutes)}</span>}
                    <span className="summary-mark" aria-hidden="true">+</span>
                  </summary>
                  <div className="day-content">
                    <div className="day-intro"><span>{day.destination.region} base</span><h4>{day.destination.name}</h4><p>{day.destination.tagline}</p>{dayDate(planInput.startDate, day.day) && <small>{dayDate(planInput.startDate, day.day)}</small>}</div>
                    <div className="activities">
                      <ActivityBlock label="Morning" activity={day.morning} nextActivity={day.afternoon} />
                      <ActivityBlock label="Afternoon" activity={day.afternoon} nextActivity={day.evening} />
                      <ActivityBlock label="Evening" activity={day.evening} />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="trip-prep section-pad" aria-labelledby="prep-title">
            <div><p className="eyebrow light">Before Manila departure</p><h3 id="prep-title">Turn the itinerary into a ready-to-go trip.</h3><p>Rules and operating details change. Use the official links rather than treating this checklist as approval or a booking.</p></div>
            <div className="prep-list">
              {PREP_ITEMS.map((item, index) => <div className="prep-item" key={item.link}><input id={`prep-${index}`} type="checkbox" /><div><label htmlFor={`prep-${index}`}>{item.label}</label><a href={item.link} target="_blank" rel="noopener noreferrer">{item.linkLabel} ↗</a></div></div>)}
              {planInput.willingToDrive && <div className="prep-item"><input id="prep-driving" type="checkbox" /><label htmlFor="prep-driving">Confirm the correct International Driving Permit, rental conditions, tolls, and parking before reserving a car.</label></div>}
            </div>
          </div>

          <div className="results-actions section-pad"><button className="secondary-button" type="button" onClick={() => document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' })}>Edit these choices</button><button className="text-button" type="button" onClick={reset}>Start over <Arrow /></button></div>
        </section>
      )}

      <section className="notes section-pad" aria-labelledby="notes-title">
        <div className="section-number">04 / Before booking</div>
        <div><p className="eyebrow">A useful estimate, not a quote</p><h2 id="notes-title">Travel changes. Your plan should say what it knows.</h2></div>
        <div className="notes-copy"><p>Ranges include Manila airfare, shared accommodation, food, activities, and domestic transport. Shopping, insurance, visas, and disruption costs are excluded.</p><p>Verify live fares, timetables, attraction hours, road rules, and pass eligibility before purchase.</p><ul>{SOURCES.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a><span>Checked {source.verifiedOn}</span></li>)}</ul></div>
      </section>

      <footer>
        <div className="wordmark"><span>日本</span> Japan, By Days</div>
        <p>Go as far as your days allow.</p>
        <button className="footer-theme" type="button" onClick={() => setTheme((current) => current === 'neon' ? 'editorial' : 'neon')}>{theme === 'neon' ? 'Paper daylight' : 'City neon'}</button>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  )
}

export default App
