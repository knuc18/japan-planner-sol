import type {
  Activity,
  BookingAdvice,
  DaySlot,
  Destination,
  Interest,
  MoneyRange,
  Season,
  SourceMetadata,
  TransportLeg,
  TransportMode,
} from './types'

export const JPY_TO_PHP_RATE = 0.3839
export const RATE_VERIFIED_ON = '2026-06-08'

export const SOURCES: SourceMetadata[] = [
  {
    label: 'JNTO transportation guidance',
    url: 'https://www.japan.travel/en/plan/getting-around/',
    verifiedOn: '2026-08-08',
  },
  {
    label: 'Official Japan Rail Pass prices and conditions',
    url: 'https://japanrailpass.net/en/purchase/price/',
    verifiedOn: '2026-08-08',
  },
  {
    label: 'Bangko Sentral ng Pilipinas reference rates',
    url: 'https://www.bsp.gov.ph/SitePages/Statistics/exchangerate.aspx',
    verifiedOn: RATE_VERIFIED_ON,
  },
]

interface ActivitySeed {
  title: string
  place?: string
  recommendation?: string
  description: string
  slot: DaySlot
  interests: Interest[]
  cost: MoneyRange
  seasons?: Season[]
  tip?: string
  durationMinutes?: number
  bookingAdvice?: BookingAdvice
  rainAlternative?: string
}

interface DestinationSeed {
  id: string
  name: string
  region: string
  tagline: string
  mapX: number
  mapY: number
  image: string
  imageAlt: string
  routeTags: Interest[]
  bestSeasons: Season[]
  areas: {
    slow: string
    food: string
    craft: string
    nature: string
    view: string
    night: string
    shrine: string
    museum: string
    dayTrip: string
  }
  foodPicks: {
    morning: [{ place: string; recommendation: string }, { place: string; recommendation: string }]
    evening: [{ place: string; recommendation: string }, { place: string; recommendation: string }]
  }
  highlights: ActivitySeed[]
}

const range = (min: number, max: number): MoneyRange => ({ min, max })

const bookingAdvice = (activity: ActivitySeed): BookingAdvice => {
  if (activity.bookingAdvice) return activity.bookingAdvice
  const text = `${activity.title} ${activity.description}`
  if (activity.interests.includes('themeParks') || /workshop|cycling|sand bath|live |performance/i.test(text)) return 'reserve'
  if (activity.interests.some((interest) => ['food', 'nightlife', 'wellness'].includes(interest)) || /museum|garden/i.test(text)) return 'check-ahead'
  return 'walk-in'
}

const activityDuration = (activity: ActivitySeed): number => {
  if (activity.durationMinutes) return activity.durationMinutes
  if (activity.interests.includes('themeParks')) return 420
  if (/half-day|day trip|day$|cycling/i.test(activity.title)) return 240
  return activity.slot === 'afternoon' ? 180 : 120
}

const commonActivities = (seed: DestinationSeed): ActivitySeed[] => [
  {
    title: `First light in ${seed.areas.slow}`,
    place: seed.areas.slow,
    description: `Walk ${seed.areas.slow} before the day gathers pace and notice the neighborhood details most visitors miss.`,
    slot: 'morning',
    interests: ['photography', 'history'],
    cost: range(0, 600),
    tip: 'Start before 8:00 for softer light and quieter streets.',
  },
  {
    title: `First food stop around ${seed.areas.food}`,
    place: seed.foodPicks.morning[1].place,
    recommendation: seed.foodPicks.morning[1].recommendation,
    description: `Use this specific counter or dining room as your first food stop around ${seed.areas.food}.`,
    slot: 'morning',
    interests: ['food'],
    cost: range(700, 1_600),
    tip: 'Cash and a few simple Japanese phrases make small counters easier.',
  },
  {
    title: `A quiet opening at ${seed.areas.shrine}`,
    place: seed.areas.shrine,
    description: `Visit ${seed.areas.shrine} near opening time for a calm introduction to local ritual and architecture.`,
    slot: 'morning',
    interests: ['history', 'photography'],
    cost: range(0, 800),
    tip: 'Keep voices low and follow posted photography rules.',
  },
  {
    title: `Seasonal morning, ${seed.name}`,
    place: seed.areas.nature,
    description: `Let the month shape a slow morning through ${seed.areas.nature}, with room for weather and seasonal color.`,
    slot: 'morning',
    interests: ['nature', 'wellness', 'photography'],
    cost: range(0, 1_200),
    seasons: seed.bestSeasons,
    tip: 'Check the local forecast the night before and bring a light layer.',
  },
  {
    title: `Plan the day from ${seed.areas.slow}`,
    place: seed.areas.slow,
    description: `Take a measured café start in ${seed.areas.slow}, then choose one nearby lane to explore without a checklist.`,
    slot: 'morning',
    interests: ['food', 'art'],
    cost: range(700, 1_500),
    tip: 'Small cafés may open later than chain shops; confirm hours.',
  },
  {
    title: `Hands-on hour in ${seed.areas.craft}`,
    place: seed.areas.craft,
    description: `Meet the materials and makers associated with ${seed.areas.craft} through a compact workshop or studio visit.`,
    slot: 'afternoon',
    interests: ['art', 'shopping', 'history'],
    cost: range(1_200, 3_800),
    tip: 'Reserve small workshops a few days ahead when possible.',
  },
  {
    title: `Green pause at ${seed.areas.nature}`,
    place: seed.areas.nature,
    description: `Trade transport for an unhurried walk through ${seed.areas.nature}.`,
    slot: 'afternoon',
    interests: ['nature', 'wellness', 'photography'],
    cost: range(0, 1_000),
    tip: 'Comfortable shoes matter more than an ambitious route.',
  },
  {
    title: `Curated afternoon at ${seed.areas.museum}`,
    place: seed.areas.museum,
    description: `Use ${seed.areas.museum} to connect the region’s art, design, and everyday history.`,
    slot: 'afternoon',
    interests: ['art', 'history'],
    cost: range(700, 2_000),
    tip: 'Many museums close one weekday; confirm before setting out.',
  },
  {
    title: `Half-day outward to ${seed.areas.dayTrip}`,
    place: seed.areas.dayTrip,
    description: `Use a local train or bus to reach ${seed.areas.dayTrip}, keeping the route deliberately compact.`,
    slot: 'afternoon',
    interests: ['nature', 'history', 'photography'],
    cost: range(1_500, 4_500),
    tip: 'Save the return timetable offline before leaving the city.',
  },
  {
    title: `Browse slowly through ${seed.areas.craft}`,
    place: seed.areas.craft,
    description: `Compare independent shops and studios in ${seed.areas.craft}, buying only what has a story worth carrying home.`,
    slot: 'afternoon',
    interests: ['shopping', 'art'],
    cost: range(0, 1_000),
    tip: 'Shopping purchases are not included in the trip estimate.',
  },
  {
    title: `Local table in ${seed.areas.food}`,
    place: seed.foodPicks.evening[1].place,
    recommendation: seed.foodPicks.evening[1].recommendation,
    description: `Build dinner around the region’s defining ingredients at a small restaurant in ${seed.areas.food}.`,
    slot: 'evening',
    interests: ['food'],
    cost: range(2_000, 5_500),
    tip: 'Join the queue or book ahead rather than chasing viral venues.',
  },
  {
    title: `Blue hour from ${seed.areas.view}`,
    place: seed.areas.view,
    description: `Watch the city or landscape change character from ${seed.areas.view}.`,
    slot: 'evening',
    interests: ['photography', 'nightlife'],
    cost: range(0, 1_500),
    tip: 'Arrive 30 minutes before sunset for the best transition.',
  },
  {
    title: `A restorative close in ${seed.name}`,
    place: `${seed.areas.slow} neighborhood sento or onsen`,
    description: `Finish with a neighborhood bath, onsen, or quiet wellness ritual close to your accommodation.`,
    slot: 'evening',
    interests: ['wellness'],
    cost: range(700, 2_500),
    tip: 'Review bathing etiquette and tattoo policies in advance.',
  },
  {
    title: `After-dark lanes of ${seed.areas.night}`,
    place: seed.areas.night,
    description: `Follow one well-lit route through ${seed.areas.night}, stopping where the atmosphere feels local and relaxed.`,
    slot: 'evening',
    interests: ['nightlife', 'food', 'photography'],
    cost: range(1_500, 4_500),
    tip: 'Keep the last train in view or choose a walkable return route.',
  },
  {
    title: `Small-stage evening in ${seed.areas.night}`,
    place: seed.areas.night,
    description: `Look for an intimate music, performance, or listening-bar experience around ${seed.areas.night}.`,
    slot: 'evening',
    interests: ['nightlife', 'art'],
    cost: range(1_800, 5_000),
    tip: 'Some venues have a cover charge or require one drink order.',
  },
]

const makeDestination = (seed: DestinationSeed): Destination => ({
  ...seed,
  activities: [...seed.highlights, ...commonActivities(seed)].map((activity, index) => {
    const foodPick = !activity.place && activity.interests[0] === 'food'
      ? seed.foodPicks[activity.slot === 'evening' ? 'evening' : 'morning'][0]
      : undefined
    return {
      id: `${seed.id}-${index + 1}`,
      title: activity.title,
      place: activity.place ?? foodPick?.place ?? activity.title,
      recommendation: activity.recommendation ?? foodPick?.recommendation,
      description: activity.description,
      slot: activity.slot,
      interests: activity.interests,
      seasons: activity.seasons ?? ['any'],
      costJPY: activity.cost,
      tip: activity.tip ?? 'Check same-day opening information before setting out.',
      durationMinutes: activityDuration(activity),
      bookingAdvice: bookingAdvice(activity),
      rainAlternative: activity.rainAlternative ?? (
        activity.interests.some((interest) => ['nature', 'photography'].includes(interest))
          ? `Move this block to ${seed.areas.museum} if weather makes the outdoor plan impractical.`
          : undefined
      ),
    }
  }),
})

const h = (
  title: string,
  description: string,
  slot: DaySlot,
  interests: Interest[],
  min: number,
  max: number,
  seasons?: Season[],
): ActivitySeed => ({ title, description, slot, interests, cost: range(min, max), seasons })

const seeds: DestinationSeed[] = [
  {
    id: 'sapporo', name: 'Sapporo', region: 'Hokkaido', tagline: 'Wide skies, winter craft, and a serious appetite.', mapX: 305, mapY: 54,
    image: '/images/hokkaido-road.webp', imageAlt: 'Open Hokkaido road curving toward a mountain', routeTags: ['food', 'nature', 'wellness', 'photography'], bestSeasons: ['summer', 'winter'],
    areas: { slow: 'Maruyama', food: 'Nijo Market and Susukino', craft: 'Soseigawa East', nature: 'Moerenuma Park', view: 'Mount Moiwa', night: 'Susukino', shrine: 'Hokkaido Jingu', museum: 'Hokkaido Museum of Modern Art', dayTrip: 'Otaru' },
    foodPicks: { morning: [{ place: 'Donburi Chaya at Nijo Market', recommendation: 'Order a uni-and-ikura seafood bowl with the morning catch.' }, { place: 'Ohiso, Nijo Market', recommendation: 'Try a kaisendon topped with sea urchin, crab, and salmon roe.' }], evening: [{ place: 'Soup Curry GARAKU', recommendation: 'Try the chicken-leg curry with Hokkaido vegetables; choose your heat level.' }, { place: 'Daruma 5.5, Susukino', recommendation: 'Grill the classic jingisukan lamb with onions at the counter.' }] },
    highlights: [
      h('Nijo Market breakfast', 'Compare seasonal seafood bowls at the city’s compact historic market.', 'morning', ['food'], 1_500, 3_500),
      h('Sapporo Beer Museum grounds', 'Trace the city’s industrial story through red-brick spaces and brewing history.', 'morning', ['history', 'food'], 0, 1_500),
      h('Isamu Noguchi at Moerenuma', 'Walk a monumental landscape where art and open space become one.', 'afternoon', ['art', 'nature', 'photography'], 0, 800),
      h('Winter play beyond the center', 'Choose a beginner-friendly snow activity with simple city access.', 'afternoon', ['nature', 'wellness'], 4_000, 9_000, ['winter']),
      h('Soup curry supper', 'Warm up with Sapporo’s spice-rich local comfort food.', 'evening', ['food'], 1_400, 2_800),
      h('Mount Moiwa night panorama', 'Take the ropeway to a broad view over the northern grid.', 'evening', ['photography', 'nightlife'], 2_100, 2_100),
    ],
  },
  {
    id: 'hakodate', name: 'Hakodate', region: 'Hokkaido', tagline: 'A port city written in slopes, markets, and light.', mapX: 282, mapY: 96,
    image: '/images/hero-journey.webp', imageAlt: 'Bullet train crossing Japanese countryside at dawn', routeTags: ['food', 'history', 'photography'], bestSeasons: ['spring', 'summer', 'autumn'],
    areas: { slow: 'Motomachi', food: 'Hakodate Morning Market', craft: 'Kanemori warehouses', nature: 'Onuma Quasi-National Park', view: 'Mount Hakodate', night: 'Bay Area', shrine: 'Hakodate Hachiman', museum: 'Hakodate Magistrate’s Office', dayTrip: 'Onuma' },
    foodPicks: { morning: [{ place: 'Kikuyo Shokudo Honten', recommendation: 'Order the tomoe-don with sea urchin, salmon roe, and scallops.' }, { place: 'Asaichi Shokudo Nibankan', recommendation: 'Choose the daily seafood bowl and add grilled squid when available.' }], evening: [{ place: 'Lucky Pierrot Bay Area Main Shop', recommendation: 'Try the Chinese Chicken Burger, the Hakodate-only signature.' }, { place: 'Hakodate Beer Hall', recommendation: 'Pair a local beer flight with grilled Hokkaido sausage.' }] },
    highlights: [
      h('Hakodate Morning Market', 'Breakfast among seafood stalls beside the station.', 'morning', ['food'], 1_300, 3_200),
      h('Motomachi hillside walk', 'Climb between preserved churches and merchant houses with harbor views.', 'morning', ['history', 'photography'], 0, 800),
      h('Goryokaku from above', 'Read the star-shaped fort and the final chapter of the shogunate.', 'afternoon', ['history', 'photography'], 1_000, 1_000),
      h('Onuma lake circuit', 'Take a compact rail escape into lakes, islands, and volcanic scenery.', 'afternoon', ['nature', 'wellness'], 1_500, 3_500),
      h('Bay warehouse dinner', 'Pair Hokkaido ingredients with the port’s brick-and-water atmosphere.', 'evening', ['food'], 2_500, 5_500),
      h('Mount Hakodate after sunset', 'See one of Japan’s most distinctive harbor nightscapes.', 'evening', ['photography', 'nightlife'], 1_800, 1_800),
    ],
  },
  {
    id: 'aomori', name: 'Aomori', region: 'Tohoku', tagline: 'Orchards, bold festivals, and Japan’s deep north.', mapX: 267, mapY: 139,
    image: '/images/hokkaido-road.webp', imageAlt: 'Green fields and mountain beneath a Hokkaido sky', routeTags: ['art', 'food', 'nature', 'history'], bestSeasons: ['summer', 'autumn', 'winter'],
    areas: { slow: 'waterfront', food: 'Furukawa Market', craft: 'A-Factory', nature: 'Hakkoda', view: 'ASPAM observatory', night: 'Honcho', shrine: 'Utou Shrine', museum: 'Aomori Museum of Art', dayTrip: 'Hirosaki' },
    foodPicks: { morning: [{ place: 'Aomori Gyosai Center', recommendation: 'Build a nokkedon with scallop, salmon roe, and the best seasonal sashimi.' }, { place: 'A-Factory', recommendation: 'Try an apple galette with a tasting flight of Aomori cider.' }], evening: [{ place: 'Osanai Shokudo', recommendation: 'Order hotate kaiyaki miso—scallop and egg cooked in a shell.' }, { place: 'Tsugaru Joppari Isariya Sakaba', recommendation: 'Ask for the seasonal shellfish plate with a glass of local sake.' }] },
    highlights: [
      h('Build a market nokkedon', 'Trade tickets for small portions and assemble a personal seafood bowl.', 'morning', ['food'], 1_500, 2_500),
      h('Nebuta craft close-up', 'Study the paper, wire, color, and movement behind Aomori’s giant festival floats.', 'morning', ['art', 'history'], 620, 620),
      h('Aomori Museum of Art', 'Meet a striking regional collection in a building cut into the earth.', 'afternoon', ['art'], 700, 1_000),
      h('Hakkoda mountain air', 'Ride toward highland marshes or snow walls according to season.', 'afternoon', ['nature', 'photography'], 2_000, 5_500),
      h('Apple-led tasting menu', 'Follow Aomori’s defining fruit from savory plate to cider.', 'evening', ['food'], 2_500, 5_000),
      h('Waterfront blue hour', 'Photograph the bay bridge and angular waterfront architecture as lights rise.', 'evening', ['photography'], 0, 800),
    ],
  },
  {
    id: 'sendai', name: 'Sendai', region: 'Tohoku', tagline: 'A green city with samurai memory and coastal reach.', mapX: 266, mapY: 218,
    image: '/images/kyoto-morning.webp', imageAlt: 'Quiet temple gate and wet stone path', routeTags: ['history', 'food', 'nature'], bestSeasons: ['spring', 'summer', 'autumn'],
    areas: { slow: 'Jozenji-dori', food: 'Sendai Asaichi', craft: 'Aoba-dori', nature: 'Akiu', view: 'Aoba Castle', night: 'Kokubuncho', shrine: 'Osaki Hachimangu', museum: 'Sendai City Museum', dayTrip: 'Matsushima' },
    foodPicks: { morning: [{ place: 'Saito Sozaiten in Sendai Asaichi', recommendation: 'Pick up a hot handmade potato croquette while browsing the market.' }, { place: 'Zunda Saryo, Sendai Station', recommendation: 'Try a zunda shake made from sweetened edamame.' }], evening: [{ place: 'Gyutan Tsukasa, East Exit', recommendation: 'Order the charcoal-grilled gyutan set with tail soup and barley rice.' }, { place: 'Rikyu, Gyutan Dori', recommendation: 'Choose the salted beef-tongue set with barley rice and tail soup.' }] },
    highlights: [
      h('Sendai Asaichi breakfast', 'Taste the everyday produce and prepared foods of the city’s morning market.', 'morning', ['food'], 800, 1_800),
      h('Zuihoden cedar approach', 'Walk through deep cedar shade to the ornate mausoleum of Date Masamune.', 'morning', ['history', 'photography'], 570, 570),
      h('Matsushima bay islands', 'Use local rail for a measured afternoon among pine-covered islands.', 'afternoon', ['nature', 'history', 'photography'], 1_500, 4_500),
      h('Akiu craft and gorge', 'Pair a short gorge walk with studios preserving regional handwork.', 'afternoon', ['nature', 'art'], 2_000, 5_000),
      h('Gyutan over charcoal', 'Try Sendai’s signature beef tongue in a classic set meal.', 'evening', ['food'], 1_800, 3_500),
      h('Jozenji-dori night walk', 'Follow the zelkova avenue into the compact evening center.', 'evening', ['nightlife', 'photography'], 0, 1_000),
    ],
  },
  {
    id: 'nikko', name: 'Nikko', region: 'Kanto', tagline: 'Sacred ornament framed by cedar and mountain water.', mapX: 251, mapY: 267,
    image: '/images/kyoto-morning.webp', imageAlt: 'Traveler approaching a temple gate through mossy woodland', routeTags: ['history', 'nature', 'photography', 'wellness'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Takinoo path', food: 'Nishi-sando', craft: 'Gokomachi', nature: 'Lake Chuzenji', view: 'Akechidaira', night: 'Kinugawa', shrine: 'Toshogu', museum: 'Nikko Tamozawa Imperial Villa', dayTrip: 'Oku-Nikko' },
    foodPicks: { morning: [{ place: 'Nikko Sakaeya', recommendation: 'Try the crisp fried yuba manju dusted with salt.' }, { place: 'Meiji-no-Yakata Cake Shop', recommendation: 'Order the baked cheesecake made famous by the historic villa restaurant.' }], evening: [{ place: 'Ganso Nikko Yuba Ryori Ebisuya', recommendation: 'Choose the yuba kaiseki to taste tofu skin simmered, fried, and fresh.' }, { place: 'Meiji-no-Yakata', recommendation: 'Try the omurice followed by the house baked cheesecake.' }] },
    highlights: [
      h('Toshogu before the crowds', 'Read the carved detail and forest setting of Tokugawa Ieyasu’s shrine.', 'morning', ['history', 'art', 'photography'], 1_600, 1_600),
      h('Kanmangafuchi stone guardians', 'Walk a riverside line of weathered Jizo figures in morning shade.', 'morning', ['history', 'nature', 'photography'], 0, 500),
      h('Lake Chuzenji and Kegon Falls', 'Climb by bus to volcanic water and one of Japan’s best-known falls.', 'afternoon', ['nature', 'photography'], 2_500, 4_500),
      h('Tamozawa Imperial Villa', 'Move through layered architecture linking Edo craft and modern court life.', 'afternoon', ['history', 'art'], 600, 600),
      h('Yuba kaiseki evening', 'Explore Nikko’s temple cuisine through delicate tofu-skin courses.', 'evening', ['food', 'history'], 3_000, 6_500),
      h('Onsen under mountain air', 'End with a simple hot-spring soak outside the shrine district.', 'evening', ['wellness'], 1_000, 3_000),
    ],
  },
  {
    id: 'tokyo', name: 'Tokyo', region: 'Kanto', tagline: 'Tiny rituals inside the world’s largest urban rhythm.', mapX: 252, mapY: 304,
    image: '/images/tokyo-evening.webp', imageAlt: 'Travelers under umbrellas on a quiet Tokyo lane', routeTags: ['food', 'art', 'anime', 'shopping', 'nightlife', 'themeParks'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Yanaka', food: 'Tsukiji Outer Market', craft: 'Kuramae', nature: 'Meiji Jingu forest', view: 'Shibuya Sky', night: 'Ebisu', shrine: 'Nezu Shrine', museum: 'Ueno museum quarter', dayTrip: 'Kamakura' },
    foodPicks: { morning: [{ place: 'Kitsuneya, Tsukiji Outer Market', recommendation: 'Order horumon-don: slow-simmered beef offal over rice.' }, { place: 'Turret Coffee Tsukiji', recommendation: 'Get the signature latte before continuing through the market lanes.' }], evening: [{ place: 'Kabuto, Omoide Yokocho', recommendation: 'Order the eel-skewer progression and watch the charcoal grill.' }, { place: 'Tsukiji Uogashi Senryo', recommendation: 'Try a kaisendon layered with tuna, salmon roe, and seasonal fish.' }] },
    highlights: [
      h('Tsukiji market breakfast', 'Taste tamagoyaki, grilled seafood, and seasonal fruit before the lanes fill.', 'morning', ['food'], 1_500, 3_500),
      h('Meiji forest to Harajuku', 'Move from a broad shrine approach into Tokyo’s fashion experiments.', 'morning', ['history', 'shopping'], 0, 1_000),
      h('TeamLab Borderless immersion', 'Enter a responsive digital-art world with a timed reservation.', 'afternoon', ['art', 'photography'], 3_800, 4_800),
      h('Akihabara subculture circuit', 'Browse arcades, specialist shops, and character culture with a clear budget.', 'afternoon', ['anime', 'shopping'], 1_000, 3_500),
      h('Tokyo DisneySea evening', 'Use a dated ticket for a sea-themed park experience unique to Tokyo.', 'evening', ['themeParks'], 7_900, 10_900),
      h('Yokocho dinner crawl', 'Choose two small stops for skewers, noodles, or sashimi instead of one long meal.', 'evening', ['food', 'nightlife'], 3_000, 6_000),
    ],
  },
  {
    id: 'hakone', name: 'Hakone', region: 'Kanto', tagline: 'Hot springs, mountain art, and a slower view of Fuji.', mapX: 226, mapY: 322,
    image: '/images/hero-journey.webp', imageAlt: 'Mount Fuji and a bullet train in warm dawn light', routeTags: ['wellness', 'nature', 'art', 'photography'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Miyanoshita', food: 'Hakone-Yumoto', craft: 'Hatajuku', nature: 'Sengokuhara', view: 'Lake Ashi', night: 'Gora', shrine: 'Hakone Shrine', museum: 'Open-Air Museum', dayTrip: 'Owakudani' },
    foodPicks: { morning: [{ place: 'Hakone Teramisu', recommendation: 'Try the original tiramisu served in a reusable milk-bottle jar.' }, { place: 'Bakery & Table Hakone', recommendation: 'Pick a curry bread and take it to the Lake Ashi footbath terrace.' }], evening: [{ place: 'Gora Brewery & Grill', recommendation: 'Pair the house craft beer with grilled local vegetables.' }, { place: 'Hatsuhana Soba Honten', recommendation: 'Order the house tororo soba made with grated mountain yam.' }] },
    highlights: [
      h('Old Tokaido cedar road', 'Walk a preserved section of the historic highway before buses arrive.', 'morning', ['history', 'nature'], 0, 1_000),
      h('Lakeside shrine morning', 'Approach Hakone Shrine through cedar forest beside Lake Ashi.', 'morning', ['history', 'photography'], 0, 800),
      h('Hakone Open-Air Museum', 'Pair modern sculpture with mountain weather and hot-spring foot baths.', 'afternoon', ['art', 'nature'], 2_000, 2_000),
      h('Owakudani volcanic loop', 'Ride the ropeway over active terrain when weather and access allow.', 'afternoon', ['nature', 'photography'], 2_500, 4_000),
      h('Ryokan kaiseki dinner', 'Let a seasonal multi-course dinner become the evening’s main event.', 'evening', ['food', 'history'], 5_000, 12_000),
      h('Private onsen reset', 'Reserve a private bath or use your inn’s public baths with time to slow down.', 'evening', ['wellness'], 1_500, 5_000),
    ],
  },
  {
    id: 'matsumoto', name: 'Matsumoto', region: 'Chubu', tagline: 'Black castle walls beneath the Japanese Alps.', mapX: 207, mapY: 314,
    image: '/images/hokkaido-road.webp', imageAlt: 'Open road and mountain landscape', routeTags: ['history', 'nature', 'art', 'photography'], bestSeasons: ['spring', 'summer', 'autumn'],
    areas: { slow: 'Nawate-dori', food: 'Nakamachi', craft: 'Nakamachi kura district', nature: 'Kamikochi', view: 'Matsumoto Castle park', night: 'Agatanomori', shrine: 'Yohashira Shrine', museum: 'Matsumoto City Museum of Art', dayTrip: 'Kamikochi' },
    foodPicks: { morning: [{ place: 'Kobayashi Soba Honten', recommendation: 'Order cold zaru soba to taste the local buckwheat cleanly.' }, { place: 'café SENRI Akane-sato', recommendation: 'Try the rich vanilla soft-serve associated with its famous visitor.' }], evening: [{ place: 'Soba Restaurant Nomugi-ji', recommendation: 'Order toji soba, warming noodles dipped into a hot iron pot.' }, { place: 'Goro’s Izakaya', recommendation: 'Try sanzoku-yaki chicken with mountain mushrooms and local sake.' }] },
    highlights: [
      h('Matsumoto Castle at opening', 'See the black keep mirrored in its moat before tour groups arrive.', 'morning', ['history', 'photography'], 700, 700),
      h('Nakamachi warehouse lanes', 'Browse white-and-black kura buildings, cafés, and small craft shops.', 'morning', ['history', 'shopping'], 0, 1_000),
      h('Yayoi Kusama in her hometown', 'Meet bold contemporary work at the city museum where the artist grew up.', 'afternoon', ['art'], 800, 1_200),
      h('Kamikochi river walk', 'Take an early bus into an alpine valley for a level riverside route.', 'afternoon', ['nature', 'photography', 'wellness'], 5_000, 7_000, ['spring', 'summer', 'autumn']),
      h('Soba and mountain vegetables', 'Order local buckwheat noodles with seasonal produce.', 'evening', ['food'], 1_500, 3_000),
      h('Castle illumination walk', 'Circle the moat after dark when the keep becomes a quiet graphic silhouette.', 'evening', ['photography'], 0, 500),
    ],
  },
  {
    id: 'takayama', name: 'Takayama', region: 'Chubu', tagline: 'Mountain mornings, timber craft, and preserved merchant streets.', mapX: 188, mapY: 326,
    image: '/images/kyoto-morning.webp', imageAlt: 'Mossy temple approach in soft morning light', routeTags: ['history', 'food', 'nature', 'shopping'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Sanmachi Suji', food: 'Miyagawa Morning Market', craft: 'Sannomachi', nature: 'Hida Folk Village', view: 'Shiroyama Park', night: 'Dekonaru Yokocho', shrine: 'Sakurayama Hachimangu', museum: 'Takayama Jinya', dayTrip: 'Shirakawa-go' },
    foodPicks: { morning: [{ place: 'Hida Kotte Ushi', recommendation: 'Try the Hida beef sushi served on a crisp rice cracker.' }, { place: 'Jinya Dango', recommendation: 'Order the savory soy-glazed mitarashi dango hot from the grill.' }], evening: [{ place: 'Ajikura Tengoku', recommendation: 'Order a Hida beef yakiniku set and grill the cuts at the table.' }, { place: 'Center4 Hamburgers', recommendation: 'Try the Hida beef burger with a local craft beer.' }] },
    highlights: [
      h('Miyagawa market morning', 'Meet farmers and snack on local produce beside the river.', 'morning', ['food', 'shopping'], 800, 2_000),
      h('Takayama Jinya at opening', 'Walk the rare surviving regional government complex before the old town fills.', 'morning', ['history'], 440, 440),
      h('Hida Folk Village', 'Study mountain farmhouses and everyday tools in an open-air landscape.', 'afternoon', ['history', 'nature'], 700, 1_500),
      h('Shirakawa-go roofs and fields', 'Use a reserved highway bus for a measured visit to the gassho village.', 'afternoon', ['history', 'nature', 'photography'], 5_000, 7_000),
      h('Hida beef tasting', 'Compare a few careful preparations rather than one oversized course.', 'evening', ['food'], 3_000, 7_000),
      h('Old-town sake evening', 'Visit one or two local breweries marked by cedar sugidama balls.', 'evening', ['food', 'history'], 1_500, 3_500),
    ],
  },
  {
    id: 'kanazawa', name: 'Kanazawa', region: 'Chubu', tagline: 'Gold leaf, contemporary art, and a garden built for rain.', mapX: 165, mapY: 312,
    image: '/images/kyoto-morning.webp', imageAlt: 'Wet stone, timber gate, and vermilion lanterns', routeTags: ['art', 'food', 'history', 'shopping'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Higashi Chaya', food: 'Omicho Market', craft: 'Nagamachi', nature: 'Kenrokuen', view: 'Kanazawa Castle', night: 'Katamachi', shrine: 'Oyama Shrine', museum: '21st Century Museum', dayTrip: 'Kaga Onsen' },
    foodPicks: { morning: [{ place: 'Yamasan Sushi Honten, Omicho Market', recommendation: 'Order the market kaisendon with whatever is best that morning.' }, { place: 'Iki-iki Tei, Omicho Market', recommendation: 'Choose the small seafood bowl and let the chef select the toppings.' }], evening: [{ place: 'Itaru Honten', recommendation: 'Ask for grilled nodoguro and pair it with an Ishikawa sake.' }, { place: 'Omicho Shokudo', recommendation: 'Try a grilled local-fish set with rice and miso soup.' }] },
    highlights: [
      h('Omicho Market breakfast', 'Taste seasonal seafood and local produce beneath the covered lanes.', 'morning', ['food'], 1_500, 3_500),
      h('Kenrokuen at opening', 'Walk one of Japan’s great gardens while dew and maintenance rituals are still visible.', 'morning', ['nature', 'history', 'photography'], 320, 320),
      h('21st Century Museum', 'Move between open public space and playful contemporary installations.', 'afternoon', ['art'], 0, 1_500),
      h('Gold-leaf craft session', 'Try the precise surface craft that became a Kanazawa signature.', 'afternoon', ['art', 'shopping'], 1_500, 4_000),
      h('Kaga cuisine dinner', 'Choose a seasonal set using local ceramics and Sea of Japan ingredients.', 'evening', ['food', 'art'], 3_500, 8_000),
      h('Higashi Chaya after closing', 'Return when the lanes quiet and timber façades hold the last light.', 'evening', ['history', 'photography'], 0, 1_000),
    ],
  },
  {
    id: 'kyoto', name: 'Kyoto', region: 'Kansai', tagline: 'Old capital, living craft, and beauty in the in-between hours.', mapX: 183, mapY: 358,
    image: '/images/kyoto-morning.webp', imageAlt: 'Traveler on a quiet Kyoto temple approach', routeTags: ['history', 'art', 'food', 'photography', 'wellness'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Gion Shirakawa', food: 'Nishiki Market', craft: 'Gojo', nature: 'Arashiyama foothills', view: 'Shogunzuka', night: 'Pontocho', shrine: 'Fushimi Inari', museum: 'Kyoto National Museum', dayTrip: 'Uji' },
    foodPicks: { morning: [{ place: 'Fukujuen Kyoto Flagship Store', recommendation: 'Try a seasonal tea and wagashi pairing in the upstairs tearoom.' }, { place: 'Inoda Coffee Honten', recommendation: 'Order the Kyoto Breakfast set with an “Arabian Pearl” coffee.' }], evening: [{ place: 'Gion Kappa', recommendation: 'Choose several obanzai plates and a Kyoto sake at the counter.' }, { place: 'Nishiki Hirano', recommendation: 'Try dashimaki tamago and a small selection of Kyoto home cooking.' }] },
    highlights: [
      h('Fushimi Inari before breakfast', 'Climb beyond the first torii tunnels while the mountain is still quiet.', 'morning', ['history', 'nature', 'photography'], 0, 800),
      h('Zen garden opening hour', 'Choose one temple and give its garden enough time to change with the light.', 'morning', ['history', 'wellness', 'photography'], 500, 800),
      h('Tea and craft in Uji', 'Use a short train ride for tea fields, temple history, and careful sweets.', 'afternoon', ['food', 'history', 'art'], 2_000, 5_000),
      h('Kyoto artisan studio', 'Meet a small workshop working in ceramics, textiles, lacquer, or bamboo.', 'afternoon', ['art', 'shopping'], 2_000, 6_000),
      h('Obanzai counter dinner', 'Choose several seasonal home-style dishes at a small neighborhood counter.', 'evening', ['food'], 2_500, 5_500),
      h('Lantern light in Gion', 'Walk respectful public lanes after dinner without treating the district as a stage.', 'evening', ['history', 'photography'], 0, 1_000),
    ],
  },
  {
    id: 'osaka', name: 'Osaka', region: 'Kansai', tagline: 'Direct, delicious, and built for a night out.', mapX: 178, mapY: 374,
    image: '/images/tokyo-evening.webp', imageAlt: 'Warm storefront lights on a rain-wet Japanese lane', routeTags: ['food', 'nightlife', 'shopping', 'themeParks', 'anime'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Nakazakicho', food: 'Kuromon and Namba', craft: 'Kitahama', nature: 'Minoh Park', view: 'Umeda Sky Building', night: 'Ura-Namba', shrine: 'Sumiyoshi Taisha', museum: 'Nakanoshima Museum of Art', dayTrip: 'Nara' },
    foodPicks: { morning: [{ place: 'Kuromon Sanpei', recommendation: 'Choose a grilled scallop or tuna sashimi portion from the market counter.' }, { place: 'Marufuku Coffee Sennichimae', recommendation: 'Order the thick hotcakes with the original dark-roast blend.' }], evening: [{ place: 'Fukutaro Honten', recommendation: 'Order the pork negiyaki with plenty of green onion.' }, { place: 'Mizuno, Dotonbori', recommendation: 'Try the yamaimo-yaki, a soft flourless-style okonomiyaki.' }] },
    highlights: [
      h('Kuromon market tasting', 'Start with grilled seafood, fruit, and dashi-forward snacks without over-ordering.', 'morning', ['food'], 1_500, 3_500),
      h('Sumiyoshi Taisha morning', 'Cross the arched bridge at one of Japan’s oldest shrine traditions.', 'morning', ['history', 'photography'], 0, 800),
      h('Nara deer and temple circuit', 'Take a simple train for Todaiji, park paths, and a measured old-town loop.', 'afternoon', ['history', 'nature', 'photography'], 2_000, 4_000),
      h('Universal Studios Japan', 'Use a dated park ticket and focus on a few priority areas rather than every queue.', 'afternoon', ['themeParks', 'anime'], 8_600, 11_900),
      h('Ura-Namba food crawl', 'Split dinner across two or three compact standing bars and counters.', 'evening', ['food', 'nightlife'], 3_000, 6_500),
      h('Dotonbori side-street frame', 'See the famous canal, then turn into quieter lanes for the better atmosphere.', 'evening', ['nightlife', 'photography'], 0, 1_500),
    ],
  },
  {
    id: 'hiroshima', name: 'Hiroshima', region: 'Chugoku', tagline: 'Memory, renewal, and island horizons.', mapX: 124, mapY: 383,
    image: '/images/hero-journey.webp', imageAlt: 'Japanese landscape in warm, layered morning light', routeTags: ['history', 'food', 'nature', 'photography'], bestSeasons: ['spring', 'autumn'],
    areas: { slow: 'Peace Boulevard', food: 'Okonomimura', craft: 'Hon-dori side streets', nature: 'Shukkeien', view: 'Orizuru Tower', night: 'Nagarekawa', shrine: 'Itsukushima Shrine', museum: 'Peace Memorial Museum', dayTrip: 'Miyajima' },
    foodPicks: { morning: [{ place: 'Kakiya, Miyajima', recommendation: 'Order a grilled-oyster set featuring Hiroshima-grown oysters.' }, { place: 'Momijido Omotesando, Miyajima', recommendation: 'Try an age-momiji: a warm, crisp-fried maple-leaf cake.' }], evening: [{ place: 'Yagenbori Hassho', recommendation: 'Order niku-tama-soba—pork, egg, cabbage, and noodles off the griddle.' }, { place: 'Mitchan Sohonten Hatchobori', recommendation: 'Try the classic pork, egg, and soba okonomiyaki.' }] },
    highlights: [
      h('Peace Park in the morning', 'Move slowly through memorial spaces before entering the museum with full attention.', 'morning', ['history'], 200, 700),
      h('Shukkeien garden opening', 'Walk a compact landscape garden shaped by islands, bridges, and borrowed scenery.', 'morning', ['nature', 'history', 'photography'], 260, 260),
      h('Miyajima beyond the gate', 'Continue past the waterfront toward temple paths or Mount Misen foothills.', 'afternoon', ['history', 'nature', 'photography'], 2_000, 5_000),
      h('Hiroshima design and renewal', 'Trace postwar architecture and civic design through the center.', 'afternoon', ['art', 'history'], 500, 2_000),
      h('Okonomiyaki at the counter', 'Watch a layered Hiroshima-style pancake come together on the griddle.', 'evening', ['food'], 1_300, 2_500),
      h('Riverside evening walk', 'Follow the rivers that define the city as the bridges and trams light up.', 'evening', ['photography', 'wellness'], 0, 700),
    ],
  },
  {
    id: 'matsuyama', name: 'Matsuyama', region: 'Shikoku', tagline: 'Castle views, literary lanes, and old bathhouse steam.', mapX: 112, mapY: 403,
    image: '/images/kyoto-morning.webp', imageAlt: 'Traditional timber architecture in a green setting', routeTags: ['wellness', 'history', 'food'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Dogo', food: 'Okaido', craft: 'Dogo shopping arcade', nature: 'Ishite River park', view: 'Matsuyama Castle', night: 'Nibancho', shrine: 'Isaniwa Shrine', museum: 'Saka no Ue no Kumo Museum', dayTrip: 'Shimanami Kaido' },
    foodPicks: { morning: [{ place: 'Ichiroku Tart, Dogo', recommendation: 'Try a slice of the spiral yuzu-and-red-bean Ichiroku tart.' }, { place: 'Dogo no Machiya', recommendation: 'Try the house burger and an Ehime citrus drink in the old machiya.' }], evening: [{ place: 'Goshiki', recommendation: 'Order Uwajima-style tai-meshi with raw sea bream, egg, and soy sauce.' }, { place: 'Kotori', recommendation: 'Order the sweet-savory nabeyaki udon served in an aluminum pot.' }] },
    highlights: [
      h('Matsuyama Castle by ropeway', 'Reach the hilltop keep early for city and Seto Inland Sea views.', 'morning', ['history', 'photography'], 1_040, 1_040),
      h('Dogo literary morning', 'Follow bathhouse streets connected with Natsume Soseki’s classic novel.', 'morning', ['history', 'art'], 0, 1_000),
      h('Shimanami cycling taste', 'Ride a manageable island section rather than trying to complete the entire route.', 'afternoon', ['nature', 'wellness', 'photography'], 3_000, 7_000),
      h('Tobe pottery encounter', 'Visit studios working in Shikoku’s sturdy blue-and-white ceramic tradition.', 'afternoon', ['art', 'shopping'], 2_000, 5_000),
      h('Sea bream rice dinner', 'Try Matsuyama tai-meshi in one of its two regional styles.', 'evening', ['food'], 2_000, 4_500),
      h('Dogo Onsen evening', 'Take a timed bath and slow walk around Japan’s best-known historic onsen district.', 'evening', ['wellness', 'history'], 700, 2_500),
    ],
  },
  {
    id: 'fukuoka', name: 'Fukuoka', region: 'Kyushu', tagline: 'A generous gateway where the night ends at a noodle stall.', mapX: 73, mapY: 397,
    image: '/images/tokyo-evening.webp', imageAlt: 'Intimate Japanese street with warm lights after rain', routeTags: ['food', 'nightlife', 'shopping', 'art'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Ohori Park', food: 'Yanagibashi Market', craft: 'Yakuin', nature: 'Uminonakamichi', view: 'Fukuoka Tower', night: 'Nakasu', shrine: 'Dazaifu Tenmangu', museum: 'Fukuoka Art Museum', dayTrip: 'Dazaifu' },
    foodPicks: { morning: [{ place: 'Yanagibashi Shokudo', recommendation: 'Ask for the day’s seafood bowl from the market catch.' }, { place: 'Kasanoya, Dazaifu approach', recommendation: 'Eat a warm umegae-mochi filled with sweet red-bean paste.' }], evening: [{ place: 'Hakata Ramen Shin-Shin, Tenjin', recommendation: 'Order the classic tonkotsu ramen with thin noodles and a firm boil.' }, { place: 'Motsunabe Rakutenchi, Tenjin', recommendation: 'Order the soy-based offal hotpot and finish with champon noodles.' }] },
    highlights: [
      h('Yanagibashi market breakfast', 'Taste mentaiko, seafood, and prepared foods at Fukuoka’s compact kitchen.', 'morning', ['food'], 1_000, 2_500),
      h('Ohori Park slow circuit', 'Walk the lake causeways before museums and cafés open.', 'morning', ['nature', 'wellness', 'photography'], 0, 800),
      h('Dazaifu culture route', 'Pair the shrine approach with the Kyushu National Museum’s broad regional lens.', 'afternoon', ['history', 'art'], 1_500, 3_000),
      h('Yakuin independent shops', 'Browse design, stationery, clothing, and coffee in a compact creative district.', 'afternoon', ['shopping', 'art'], 0, 1_500),
      h('Hakata ramen at a yatai', 'Order a simple bowl at a licensed riverside stall and keep the stop convivial.', 'evening', ['food', 'nightlife'], 1_200, 2_500),
      h('Nakasu river lights', 'Walk the riverfront after dinner, then return by subway before the last train.', 'evening', ['nightlife', 'photography'], 0, 1_200),
    ],
  },
  {
    id: 'beppu', name: 'Beppu', region: 'Kyushu', tagline: 'Steam in the streets and mountains at the edge of town.', mapX: 89, mapY: 416,
    image: '/images/hokkaido-road.webp', imageAlt: 'Open green landscape with a mountain horizon', routeTags: ['wellness', 'nature', 'food'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Takegawara', food: 'Beppu Station Market', craft: 'Kitahama', nature: 'Mount Tsurumi', view: 'Yukemuri Observatory', night: 'Kitahama', shrine: 'Hachiman Asami', museum: 'Beppu Art Museum', dayTrip: 'Yufuin' },
    foodPicks: { morning: [{ place: 'Jigoku Mushi Kobo Kannawa', recommendation: 'Steam eggs, vegetables, and seafood over the hot-spring vents.' }, { place: 'Tomonaga Panya', recommendation: 'Pick up the soft anpan filled with red-bean paste before it sells out.' }], evening: [{ place: 'Restaurant Toyoken', recommendation: 'Order toriten, the light chicken tempura said to have begun here.' }, { place: 'Amamichaya', recommendation: 'Try dango-jiru soup with a side of toriten and kabosu citrus.' }] },
    highlights: [
      h('Steam-street morning', 'Walk the lanes around Takegawara as vents and bathhouses begin the day.', 'morning', ['wellness', 'photography'], 0, 800),
      h('Jigoku-mushi breakfast', 'Try food cooked by natural geothermal steam.', 'morning', ['food', 'wellness'], 1_200, 2_500),
      h('Beppu hells circuit', 'Choose a focused group of vivid geothermal pools instead of rushing all seven.', 'afternoon', ['nature', 'photography'], 1_300, 2_400),
      h('Yufuin lake and lanes', 'Use a local train or bus for art, mountain views, and a slower onsen town.', 'afternoon', ['nature', 'art', 'shopping'], 2_500, 5_000),
      h('Sand bath ritual', 'Experience a staffed hot-sand bath followed by a conventional soak.', 'evening', ['wellness'], 1_500, 3_000),
      h('Toriten and local shochu', 'Pair Oita-style chicken tempura with a restrained tasting of the regional spirit.', 'evening', ['food'], 1_800, 4_000),
    ],
  },
  {
    id: 'kagoshima', name: 'Kagoshima', region: 'Kyushu', tagline: 'Volcanic scale, southern flavor, and ferries across the bay.', mapX: 70, mapY: 459,
    image: '/images/hokkaido-road.webp', imageAlt: 'A broad road leading toward a volcanic mountain', routeTags: ['nature', 'food', 'history', 'photography'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Meizanbori', food: 'Tenmonkan', craft: 'Maruya Gardens area', nature: 'Sengan-en', view: 'Shiroyama', night: 'Tenmonkan', shrine: 'Terukuni Shrine', museum: 'Museum of the Meiji Restoration', dayTrip: 'Sakurajima' },
    foodPicks: { morning: [{ place: 'Akashiya Honten', recommendation: 'Try karukan, the steamed yam-and-rice sweet associated with Kagoshima.' }, { place: 'Tenmonkan Mujaki', recommendation: 'Share the original shirokuma shaved ice with fruit and condensed milk.' }], evening: [{ place: 'Kagoshima Kurobuta Roppakutei', recommendation: 'Order the Roppaku black-pork shabu-shabu or tonkatsu.' }, { place: 'Ajimori', recommendation: 'Try the kurobuta shabu-shabu in the restaurant that popularized the style.' }] },
    highlights: [
      h('Sakurajima ferry morning', 'Cross the bay early and walk a short lava-field route beneath the volcano.', 'morning', ['nature', 'photography'], 500, 2_000),
      h('Sengan-en garden view', 'See borrowed volcanic scenery through a former Shimadzu clan residence.', 'morning', ['history', 'nature', 'photography'], 1_600, 1_600),
      h('Meiji Restoration context', 'Connect Kagoshima’s local figures to the political remaking of modern Japan.', 'afternoon', ['history'], 600, 1_000),
      h('Ibusuki sand-bath day trip', 'Ride south for a geothermal sand bath beside the sea.', 'afternoon', ['wellness', 'nature'], 4_000, 8_000),
      h('Kurobuta dinner', 'Try Kagoshima black pork as shabu-shabu or tonkatsu.', 'evening', ['food'], 2_500, 5_500),
      h('Shiroyama sunset', 'Watch Sakurajima change color across the bay from the city’s wooded ridge.', 'evening', ['photography', 'nature'], 0, 1_000),
    ],
  },
  {
    id: 'naha', name: 'Naha', region: 'Okinawa', tagline: 'Island history, bright markets, and a different Japan.', mapX: 35, mapY: 557,
    image: '/images/hero-journey.webp', imageAlt: 'Warm Japanese horizon suggesting a long onward journey', routeTags: ['food', 'history', 'nature', 'wellness', 'shopping'], bestSeasons: ['spring', 'autumn', 'winter'],
    areas: { slow: 'Tsuboya', food: 'Makishi Public Market', craft: 'Tsuboya pottery street', nature: 'Cape Chinen', view: 'Shurijo heights', night: 'Sakaemachi', shrine: 'Naminoue Shrine', museum: 'Okinawa Prefectural Museum', dayTrip: 'Zamami Island' },
    foodPicks: { morning: [{ place: 'Pork Tamago Onigiri Honten, Makishi', recommendation: 'Try the pork-and-egg rice sandwich with goya tempura.' }, { place: 'C&C Breakfast Okinawa', recommendation: 'Order the soufflé pancakes with Okinawan fruit.' }], evening: [{ place: 'Live House Shima-Uta', recommendation: 'Pair an Okinawan set meal with a live sanshin performance.' }, { place: 'Yunangi', recommendation: 'Order rafute pork and goya champuru for a compact Okinawan sampler.' }] },
    highlights: [
      h('Makishi market breakfast', 'Choose island fruit, tofu, and small local dishes around the public market.', 'morning', ['food'], 1_000, 2_500),
      h('Shurijo restoration visit', 'Understand the Ryukyu Kingdom through the castle grounds and ongoing rebuilding.', 'morning', ['history', 'art'], 400, 1_200),
      h('Tsuboya pottery studios', 'Meet the bold glazes and everyday forms of Okinawan yachimun.', 'afternoon', ['art', 'shopping'], 1_000, 3_500),
      h('Zamami blue-water day', 'Use a reserved ferry for clear water and island walking when sea conditions allow.', 'afternoon', ['nature', 'wellness', 'photography'], 6_000, 10_000, ['spring', 'summer', 'autumn']),
      h('Okinawan music dinner', 'Pair island dishes with a small live sanshin performance.', 'evening', ['food', 'nightlife', 'art'], 2_500, 5_500),
      h('Sakaemachi market night', 'Move through a relaxed postwar market district of tiny counters and bars.', 'evening', ['food', 'nightlife'], 2_000, 4_500),
    ],
  },
]

export const DESTINATIONS = seeds.map(makeDestination)
export const DESTINATION_BY_ID = new Map(DESTINATIONS.map((destination) => [destination.id, destination]))

export interface RouteCorridor {
  id: string
  name: string
  gateway: 'tokyo' | 'osaka' | 'fukuoka' | 'sapporo' | 'naha'
  minDays: number
  interests: Interest[]
  seasons: Season[]
  destinations: string[]
}

export const ROUTES: RouteCorridor[] = [
  { id: 'essential', name: 'The Essential Arc', gateway: 'tokyo', minDays: 7, interests: ['food', 'history', 'art', 'shopping', 'themeParks'], seasons: ['any'], destinations: ['tokyo', 'hakone', 'kyoto', 'osaka', 'hiroshima', 'fukuoka'] },
  { id: 'northern', name: 'The Northern Line', gateway: 'sapporo', minDays: 8, interests: ['nature', 'food', 'photography', 'wellness'], seasons: ['summer', 'autumn', 'winter'], destinations: ['sapporo', 'hakodate', 'aomori', 'sendai', 'nikko', 'tokyo'] },
  { id: 'alpine', name: 'The Alpine Thread', gateway: 'tokyo', minDays: 9, interests: ['nature', 'history', 'art', 'wellness', 'photography'], seasons: ['spring', 'summer', 'autumn'], destinations: ['tokyo', 'matsumoto', 'takayama', 'kanazawa', 'kyoto', 'osaka'] },
  { id: 'western', name: 'The Inland Sea & South', gateway: 'osaka', minDays: 10, interests: ['food', 'history', 'wellness', 'art'], seasons: ['spring', 'autumn', 'winter'], destinations: ['osaka', 'kyoto', 'hiroshima', 'matsuyama', 'fukuoka', 'beppu', 'kagoshima'] },
  { id: 'islands', name: 'The Island Reset', gateway: 'naha', minDays: 4, interests: ['nature', 'wellness', 'food', 'history'], seasons: ['spring', 'summer', 'autumn', 'winter'], destinations: ['naha', 'fukuoka', 'beppu', 'kagoshima'] },
  { id: 'grand', name: 'The Grand Traverse', gateway: 'sapporo', minDays: 21, interests: ['food', 'history', 'nature', 'art', 'photography'], seasons: ['any'], destinations: ['sapporo', 'hakodate', 'sendai', 'tokyo', 'kanazawa', 'kyoto', 'osaka', 'hiroshima', 'fukuoka', 'beppu', 'kagoshima', 'naha'] },
]

const makeLeg = (
  from: string,
  to: string,
  mode: TransportMode,
  durationMinutes: number,
  min: number,
  max: number,
  note: string,
  alternativeMode?: TransportMode,
  drivingCostJPY?: MoneyRange,
): TransportLeg => ({ from, to, mode, durationMinutes, costJPY: range(min, max), note, alternativeMode, drivingCostJPY })

const legs = [
  makeLeg('sapporo', 'hakodate', 'train', 225, 9_500, 10_500, 'Limited express through southern Hokkaido; reserve a window seat.', 'car', range(11_000, 18_000)),
  makeLeg('hakodate', 'aomori', 'train', 145, 7_500, 9_000, 'Local connection plus Hokkaido Shinkansen through the Seikan tunnel.'),
  makeLeg('aomori', 'sendai', 'train', 165, 11_000, 13_000, 'Shinkansen south with one short local connection.'),
  makeLeg('hakodate', 'sendai', 'train', 250, 17_000, 19_500, 'Hokkaido and Tohoku Shinkansen connection.'),
  makeLeg('sendai', 'nikko', 'train', 145, 9_000, 11_000, 'Shinkansen to Utsunomiya, then local rail to Nikko.'),
  makeLeg('nikko', 'tokyo', 'train', 125, 3_000, 6_000, 'Direct private railway or JR connections depending on your hotel.'),
  makeLeg('sendai', 'tokyo', 'train', 95, 11_000, 12_500, 'Fast Tohoku Shinkansen service; seat reservation recommended.'),
  makeLeg('tokyo', 'hakone', 'train', 95, 2_000, 4_500, 'Rail to Odawara or Hakone-Yumoto; use a local pass only if the loop adds value.'),
  makeLeg('hakone', 'kyoto', 'train', 155, 12_000, 14_500, 'Return to Odawara, then take the Tokaido Shinkansen.'),
  makeLeg('tokyo', 'matsumoto', 'train', 165, 6_500, 7_500, 'Limited express from Shinjuku into the Japanese Alps.'),
  makeLeg('matsumoto', 'takayama', 'bus', 150, 4_000, 4_500, 'Reserved mountain bus; pack snacks and keep luggage compact.'),
  makeLeg('takayama', 'kanazawa', 'bus', 135, 4_000, 5_500, 'Reserved highway bus, optionally stopping at Shirakawa-go.'),
  makeLeg('tokyo', 'kanazawa', 'train', 155, 14_000, 15_500, 'Hokuriku Shinkansen; reserve seats during holiday periods.'),
  makeLeg('kanazawa', 'kyoto', 'train', 125, 7_500, 9_000, 'Hokuriku route with a transfer at Tsuruga.'),
  makeLeg('kyoto', 'osaka', 'train', 30, 600, 1_500, 'Frequent local or rapid trains; choose the station nearest your hotel.'),
  makeLeg('kyoto', 'hiroshima', 'train', 105, 10_500, 12_000, 'Tokaido and Sanyo Shinkansen with a transfer at Shin-Osaka.'),
  makeLeg('osaka', 'hiroshima', 'train', 90, 10_000, 11_500, 'Sanyo Shinkansen from Shin-Osaka; pass restrictions may affect the fastest services.'),
  makeLeg('hiroshima', 'matsuyama', 'ferry', 160, 5_000, 9_000, 'High-speed boat or ferry across the Seto Inland Sea.'),
  makeLeg('matsuyama', 'fukuoka', 'ferry', 420, 8_000, 14_000, 'Overnight ferry to Kokura, then a short rail connection to Fukuoka.'),
  makeLeg('hiroshima', 'fukuoka', 'train', 70, 9_000, 10_500, 'Sanyo Shinkansen to Hakata.'),
  makeLeg('fukuoka', 'beppu', 'train', 125, 5_500, 7_000, 'Limited express along northern Kyushu.', 'car', range(8_000, 13_000)),
  makeLeg('beppu', 'kagoshima', 'train', 235, 13_000, 16_000, 'Limited express to Kokura or Oita connections, then Kyushu Shinkansen.'),
  makeLeg('kagoshima', 'naha', 'flight', 85, 9_000, 22_000, 'Domestic flight; add airport time and confirm baggage rules.'),
  makeLeg('naha', 'fukuoka', 'flight', 105, 8_000, 22_000, 'Domestic flight with variable low-cost and full-service fares.'),
  makeLeg('tokyo', 'naha', 'flight', 170, 10_000, 28_000, 'Domestic flight from Haneda or Narita; compare total airport time.'),
]

export const LEG_BY_PAIR = new Map(legs.flatMap((leg) => [
  [`${leg.from}:${leg.to}`, leg],
  [`${leg.to}:${leg.from}`, { ...leg, from: leg.to, to: leg.from }],
]))

export const MANILA_AIRFARE_JPY: Record<RouteCorridor['gateway'], MoneyRange> = {
  tokyo: range(34_000, 78_000),
  osaka: range(30_000, 70_000),
  fukuoka: range(28_000, 65_000),
  sapporo: range(45_000, 95_000),
  naha: range(38_000, 85_000),
}

export const DAILY_BUDGETS = {
  smart: { accommodation: range(6_500, 11_000), food: range(3_000, 5_000), localTransport: range(900, 1_800) },
  comfortable: { accommodation: range(13_000, 23_000), food: range(5_000, 8_500), localTransport: range(1_200, 2_500) },
  premium: { accommodation: range(28_000, 48_000), food: range(9_000, 16_000), localTransport: range(1_800, 4_000) },
} as const
