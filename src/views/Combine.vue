<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

interface CombinePlayer {
  name: string
  height: string
  weight: string
  fortyYardDash: string
  vertical: string
  broad: string
  threeCone: string
  shuttle: string
  weightedBench: string
  benchWeight: string
  punt: string
  pass: string
  puntPassKick: string
  image: string
}

type StatKey = Exclude<keyof CombinePlayer, 'name' | 'image'>

interface StatDefinition {
  key: StatKey
  label: string
  suffix?: string
}

interface CombineEvent extends StatDefinition {
  lowerIsBetter: boolean
  zeroIsMissing?: boolean
}

interface RankedPlayer {
  player: CombinePlayer
  value: number
  rank: number
}

interface RadarPoint {
  key: StatKey
  label: string
  percent: number
  x: number
  y: number
  labelX: number
  labelY: number
  labelAnchor: 'start' | 'middle' | 'end'
}

const apiUrl = 'https://sheetdb.io/api/v1/qbrvaxt05k5zv?gid=1427160562'
const comparisonsUrl = 'https://docs.google.com/spreadsheets/d/1zKczriMFJFoZrKq-VvhVyTKH22hjK5LCJXr--IWl2Q8/export?format=csv&gid=1660336706'
const cacheKey = 'combine-results-v2'
const comparisonsCacheKey = 'combine-player-comparisons-v1'
const cacheMaxAge = 15 * 60 * 1000
const radarCenter = { x: 230, y: 195 }
const radarRadius = 105

const stats: StatDefinition[] = [
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight', suffix: ' lb' },
  { key: 'fortyYardDash', label: '40 Yard Dash', suffix: ' sec' },
  { key: 'vertical', label: 'Vertical', suffix: ' in' },
  { key: 'broad', label: 'Broad', suffix: ' in' },
  { key: 'threeCone', label: '3 Cone', suffix: ' sec' },
  { key: 'shuttle', label: 'Shuttle', suffix: ' sec' },
  { key: 'weightedBench', label: 'Weighted Bench' },
  { key: 'benchWeight', label: 'Bench Weight' },
  { key: 'punt', label: 'Punt' },
  { key: 'pass', label: 'Pass' },
  { key: 'puntPassKick', label: 'Punt Pass Kick' },
]

const events: CombineEvent[] = [
  { key: 'height', label: 'Height', lowerIsBetter: false, zeroIsMissing: true },
  { key: 'weight', label: 'Weight', suffix: ' lb', lowerIsBetter: false, zeroIsMissing: true },
  { key: 'fortyYardDash', label: '40 Yard Dash', suffix: ' sec', lowerIsBetter: true, zeroIsMissing: true },
  { key: 'vertical', label: 'Vertical', suffix: ' in', lowerIsBetter: false, zeroIsMissing: true },
  { key: 'broad', label: 'Broad', suffix: ' in', lowerIsBetter: false, zeroIsMissing: true },
  { key: 'threeCone', label: '3 Cone', suffix: ' sec', lowerIsBetter: true, zeroIsMissing: true },
  { key: 'shuttle', label: 'Shuttle', suffix: ' sec', lowerIsBetter: true, zeroIsMissing: true },
  { key: 'weightedBench', label: 'Weighted Bench', lowerIsBetter: false },
  { key: 'punt', label: 'Punt', lowerIsBetter: false },
  { key: 'pass', label: 'Pass', lowerIsBetter: false },
  { key: 'puntPassKick', label: 'Punt Pass Kick', lowerIsBetter: false },
]

const sheetFields: Record<StatKey, string> = {
  height: 'Height',
  weight: 'Weight',
  fortyYardDash: '40 Yard Dash',
  vertical: 'Vertical',
  broad: 'Broad',
  threeCone: '3 Cone',
  shuttle: 'Shuttle',
  weightedBench: 'Weighterd Bench',
  benchWeight: 'Bench Weight',
  punt: 'Punt',
  pass: 'Pass',
  puntPassKick: 'Punt Pass Kick',
}

const players = ref<CombinePlayer[]>([])
const playerComparisons = ref<Record<string, Partial<Record<StatKey, string>>>>({})
const loading = ref(true)
const errorMessage = ref('')
const refreshMessage = ref('')
const comparisonMessage = ref('')
const activeView = ref<'events' | 'players'>('events')
const selectedEvent = ref<StatKey>('fortyYardDash')
const selectedPlayerName = ref('')
const failedImages = ref(new Set<string>())
let requestInFlight = false

const availableEvents = computed(() =>
  events.filter((event) => players.value.some((player) => getEventValue(player, event) !== null)),
)

const selectedMetric = computed(() =>
  availableEvents.value.find((event) => event.key === selectedEvent.value),
)

const selectedPlayer = computed(() =>
  players.value.find((player) => player.name === selectedPlayerName.value),
)

const selectedPlayerComparisons = computed(() =>
  selectedPlayer.value ? playerComparisons.value[selectedPlayer.value.name] ?? {} : {},
)

const selectedImageUrl = computed(() =>
  selectedPlayer.value ? getImageUrl(selectedPlayer.value.image) : '',
)

function getRankedResults(event: CombineEvent): RankedPlayer[] {
  const results = players.value
    .map((player) => ({ player, value: getEventValue(player, event) }))
    .filter((result): result is { player: CombinePlayer; value: number } => result.value !== null)
    .sort((a, b) => {
      const difference = event.lowerIsBetter ? a.value - b.value : b.value - a.value
      return difference || a.player.name.localeCompare(b.player.name)
    })

  let previousValue: number | undefined
  let currentRank = 0

  return results.map((result, index) => {
    if (result.value !== previousValue) currentRank = index + 1
    previousValue = result.value
    return { ...result, rank: currentRank }
  })
}

const rankedPlayers = computed<RankedPlayer[]>(() => {
  const event = selectedMetric.value
  return event ? getRankedResults(event) : []
})

const radarPoints = computed<RadarPoint[]>(() => {
  const player = selectedPlayer.value
  if (!player) return []

  const playerEvents = availableEvents.value.filter(
    (event) => getEventValue(player, event) !== null,
  )

  return playerEvents.map((event, index) => {
    const results = getRankedResults(event)
    const result = results.find(({ player: rankedPlayer }) => rankedPlayer.name === player.name)
    const percent = result
      ? results.length <= 1
        ? 100
        : ((results.length - result.rank) / (results.length - 1)) * 100
      : 0
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / playerEvents.length
    const distance = (percent / 100) * radarRadius
    const labelDistance = radarRadius + 38
    const labelX = radarCenter.x + labelDistance * Math.cos(angle)
    const labelY = radarCenter.y + labelDistance * Math.sin(angle)

    return {
      key: event.key,
      label: event.label,
      percent: Math.round(percent),
      x: radarCenter.x + distance * Math.cos(angle),
      y: radarCenter.y + distance * Math.sin(angle),
      labelX,
      labelY,
      labelAnchor: Math.cos(angle) > 0.35 ? 'start' : Math.cos(angle) < -0.35 ? 'end' : 'middle',
    }
  })
})

const radarGridLevels = [20, 40, 60, 80, 100]
const radarPolygonPoints = computed(() =>
  radarPoints.value.map((point) => `${point.x},${point.y}`).join(' '),
)

function radarGridPoints(level: number): string {
  const radius = (level / 100) * radarRadius
  return radarPoints.value
    .map((_, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / radarPoints.value.length
      return `${radarCenter.x + radius * Math.cos(angle)},${radarCenter.y + radius * Math.sin(angle)}`
    })
    .join(' ')
}

function radarAxisEnd(index: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / radarPoints.value.length
  return {
    x: radarCenter.x + radarRadius * Math.cos(angle),
    y: radarCenter.y + radarRadius * Math.sin(angle),
  }
}

function readText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePlayer(value: unknown): CombinePlayer | null {
  if (!isRecord(value)) return null

  const name = readText(value.Name)
  if (!name) return null

  return {
    name,
    height: readText(value[sheetFields.height]),
    weight: readText(value[sheetFields.weight]),
    fortyYardDash: readText(value[sheetFields.fortyYardDash]),
    vertical: readText(value[sheetFields.vertical]),
    broad: readText(value[sheetFields.broad]),
    threeCone: readText(value[sheetFields.threeCone]),
    shuttle: readText(value[sheetFields.shuttle]),
    weightedBench: readText(value[sheetFields.weightedBench]),
    benchWeight: readText(value[sheetFields.benchWeight]),
    punt: readText(value[sheetFields.punt]),
    pass: readText(value[sheetFields.pass]),
    puntPassKick: readText(value[sheetFields.puntPassKick]),
    image: readText(value.Image),
  }
}

function applyPlayers(nextPlayers: CombinePlayer[]) {
  players.value = nextPlayers

  if (!nextPlayers.some((player) => player.name === selectedPlayerName.value)) {
    selectedPlayerName.value = nextPlayers[0]?.name ?? ''
  }

  if (!events.some((event) => event.key === selectedEvent.value && nextPlayers.some((player) => getEventValue(player, event) !== null))) {
    selectedEvent.value = events.find((event) => nextPlayers.some((player) => getEventValue(player, event) !== null))?.key
      ?? 'fortyYardDash'
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      row.push(field)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      field = ''
      if (character === '\r' && text[index + 1] === '\n') index += 1
    } else {
      field += character
    }
  }

  if (field.length || row.length) {
    row.push(field)
    if (row.some((cell) => cell.trim())) rows.push(row)
  }

  return rows
}

function parseComparisons(rows: string[][]): Record<string, Partial<Record<StatKey, string>>> {
  const [headers, ...dataRows] = rows
  if (!headers?.includes('Name')) {
    throw new Error('The NFL comparison sheet is missing the Name column.')
  }

  const nameIndex = headers.indexOf('Name')
  const statColumns = stats.flatMap((stat) => {
    const index = headers.indexOf(sheetFields[stat.key])
    return index >= 0 ? [{ index, key: stat.key }] : []
  })
  const parsed: Record<string, Partial<Record<StatKey, string>>> = {}

  for (const row of dataRows) {
    const name = row[nameIndex]?.trim()
    if (!name) continue

    const comparisons: Partial<Record<StatKey, string>> = {}
    for (const { index, key } of statColumns) {
      const comparisonName = row[index]?.trim()
      if (comparisonName) comparisons[key] = comparisonName
    }
    parsed[name] = comparisons
  }

  return parsed
}

function isComparisonMap(value: unknown): value is Record<string, Partial<Record<StatKey, string>>> {
  return isRecord(value)
    && Object.values(value).every((comparison) =>
      isRecord(comparison)
      && Object.entries(comparison).every(([key, name]) => key in sheetFields && typeof name === 'string'),
    )
}

function readCachedComparisons(): { comparisons: Record<string, Partial<Record<StatKey, string>>>; savedAt: number } | null {
  try {
    const cached = localStorage.getItem(comparisonsCacheKey)
    if (!cached) return null

    const parsed: unknown = JSON.parse(cached)
    if (!isRecord(parsed) || !isComparisonMap(parsed.comparisons) || typeof parsed.savedAt !== 'number') return null

    return {
      comparisons: parsed.comparisons,
      savedAt: parsed.savedAt,
    }
  } catch (error) {
    console.warn('Could not read cached NFL comparisons.', error)
    return null
  }
}

async function loadComparisons() {
  const cached = readCachedComparisons()
  if (cached) playerComparisons.value = cached.comparisons
  if (cached && Date.now() - cached.savedAt < cacheMaxAge) return

  try {
    const response = await fetch(comparisonsUrl)
    if (!response.ok) {
      throw new Error(`NFL comparisons could not be loaded (HTTP ${response.status}).`)
    }

    const comparisons = parseComparisons(parseCsv(await response.text()))
    playerComparisons.value = comparisons
    comparisonMessage.value = ''
    try {
      localStorage.setItem(comparisonsCacheKey, JSON.stringify({ savedAt: Date.now(), comparisons }))
    } catch (error) {
      console.warn('Could not save NFL comparisons locally.', error)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred while loading NFL comparisons.'
    comparisonMessage.value = cached ? `${message} Showing saved comparisons.` : message
  }
}

function readCachedPlayers(): { players: CombinePlayer[]; savedAt: number } | null {
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    const parsed: unknown = JSON.parse(cached)
    if (!isRecord(parsed) || !Array.isArray(parsed.rows) || typeof parsed.savedAt !== 'number') return null

    const cachedPlayers = parsed.rows
      .map(parsePlayer)
      .filter((player): player is CombinePlayer => player !== null)

    return { players: cachedPlayers, savedAt: parsed.savedAt }
  } catch (error) {
    console.warn('Could not read cached combine results.', error)
    return null
  }
}

function savePlayersToCache(rows: unknown[]) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), rows }))
  } catch (error) {
    console.warn('Could not save combine results locally.', error)
  }
}

async function loadPlayers(forceRefresh = false) {
  if (requestInFlight) return

  const cached = readCachedPlayers()
  if (cached && players.value.length === 0) {
    applyPlayers(cached.players)
  }

  const cacheIsFresh = cached && Date.now() - cached.savedAt < cacheMaxAge
  if (cacheIsFresh && !forceRefresh) {
    errorMessage.value = ''
    refreshMessage.value = 'Loaded saved results.'
    loading.value = false
    return
  }

  loading.value = players.value.length === 0
  errorMessage.value = ''
  refreshMessage.value = players.value.length ? 'Refreshing saved results…' : ''
  requestInFlight = true

  try {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`Combine results could not be loaded (HTTP ${response.status}).`)
    }

    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('The combine results returned an unexpected format.')
    }

    const nextPlayers = data.map(parsePlayer).filter((player): player is CombinePlayer => player !== null)
    applyPlayers(nextPlayers)
    savePlayersToCache(data)
    refreshMessage.value = ''
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred while loading combine results.'
    if (players.value.length) {
      refreshMessage.value = `${message} Showing saved results.`
    } else {
      errorMessage.value = message
    }
  } finally {
    loading.value = false
    requestInFlight = false
  }
}

function getEventValue(player: CombinePlayer, event: CombineEvent): number | null {
  const rawValue = player[event.key]
  if (!rawValue) return null

  const value = Number(rawValue)
  if (!Number.isFinite(value) || (event.zeroIsMissing && value === 0)) return null
  return value
}

function getImageUrl(value: string): string {
  if (!value) return ''

  const driveFileId = value.match(/drive\.google\.com\/file\/d\/([^/]+)/)?.[1]
    ?? value.match(/[?&]id=([^&]+)/)?.[1]

  if (driveFileId) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1200`
  if (/drive\.google\.com\/drive\/folders\//.test(value)) return ''
  return value
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
}

function displayValue(value: string, suffix = ''): string {
  return value ? `${value}${suffix}` : '—'
}

function formatHeight(value: string): string {
  const height = value.match(/^(\d)(\d{2})0$/)
  if (!height) return value || '—'

  const feet = Number(height[1])
  const inches = Number(height[2])
  if (inches > 11) return value
  return `${feet}′${inches}″`
}

onMounted(() => {
  void loadPlayers()
  void loadComparisons()
})
</script>

<template>
  <main class="combine-page">
    <header class="page-header">
      <RouterLink class="home-link" to="/" aria-label="Back to home">← Home</RouterLink>
      <p class="eyebrow">ATHLETIC PERFORMANCE</p>
      <h1>Combine Results</h1>
      <p class="intro">2026 Combine 10/3 - 10/4</p>
    </header>

    <section class="results-panel" aria-label="Combine results">
      <div class="view-switch" role="tablist" aria-label="Results view">
        <button
          type="button"
          role="tab"
          :aria-selected="activeView === 'events'"
          :class="{ active: activeView === 'events' }"
          @click="activeView = 'events'"
        >
          Event leaderboard
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeView === 'players'"
          :class="{ active: activeView === 'players' }"
          @click="activeView = 'players'"
        >
          Player stats
        </button>
      </div>

      <p v-if="refreshMessage && players.length" class="refresh-message" role="status">
        {{ refreshMessage }}
      </p>

      <div v-if="loading" class="message-state" role="status">
        <span class="loader" aria-hidden="true"></span>
        Loading combine results…
      </div>

      <div v-else-if="errorMessage" class="message-state error-state" role="alert">
        <p>{{ errorMessage }}</p>
        <button class="secondary-button" type="button" @click="loadPlayers(true)">Try again</button>
      </div>

      <div v-else-if="players.length === 0" class="message-state">
        No combine results were found.
      </div>

      <template v-else-if="activeView === 'events'">
        <div class="selector-row">
          <div>
            <label for="event-select">Choose an event</label>
            <select id="event-select" v-model="selectedEvent">
              <option v-for="event in availableEvents" :key="event.key" :value="event.key">
                {{ event.label }}
              </option>
            </select>
          </div>
          <p v-if="selectedMetric" class="ranking-hint">
            {{ selectedMetric.lowerIsBetter ? 'Fastest time ranks first' : 'Highest result ranks first' }}
          </p>
        </div>

        <div v-if="rankedPlayers.length" class="leaderboard">
          <div class="leaderboard-heading">
            <span>Rank</span>
            <span>Player</span>
            <span>{{ selectedMetric?.label }}</span>
          </div>
          <ol class="leaderboard-list">
            <li v-for="result in rankedPlayers" :key="result.player.name" class="leaderboard-row">
              <span class="rank">{{ String(result.rank).padStart(2, '0') }}</span>
              <span class="player-name">{{ result.player.name }}</span>
              <strong class="event-result">{{ displayValue(String(result.value), selectedMetric?.suffix) }}</strong>
            </li>
          </ol>
        </div>
        <p v-else class="empty-state">There are no recorded results for this event yet.</p>
      </template>

      <template v-else>
        <div class="selector-row player-selector">
          <div>
            <label for="player-select">Choose a player</label>
            <select id="player-select" v-model="selectedPlayerName">
              <option v-for="player in players" :key="player.name" :value="player.name">
                {{ player.name }}
              </option>
            </select>
          </div>
        </div>

        <article v-if="selectedPlayer" class="player-profile">
          <div class="profile-layout">
            <div class="profile-identity">
              <div class="player-photo">
                <img
                  v-if="selectedImageUrl && !failedImages.has(selectedImageUrl)"
                  :key="selectedImageUrl"
                  :src="selectedImageUrl"
                  :alt="selectedPlayer.name"
                  loading="eager"
                  referrerpolicy="no-referrer"
                  @error="failedImages.add(selectedImageUrl)"
                />
                <span v-else class="avatar-fallback">{{ initials(selectedPlayer.name) }}</span>
              </div>
              <div class="identity-copy">
                <p class="eyebrow">PLAYER PROFILE</p>
                <h2>{{ selectedPlayer.name }}</h2>
              </div>
            </div>

            <section v-if="radarPoints.length" class="radar-section" aria-labelledby="radar-title">
              <div class="radar-heading">
                <div>
                  <p class="eyebrow">RELATIVE PERFORMANCE</p>
                  <h3 id="radar-title">Combine percentiles</h3>
                </div>
                <span class="radar-note">Relative rank</span>
              </div>

              <div class="radar-content">
                <svg
                  class="radar-chart"
                  viewBox="0 0 460 390"
                  role="img"
                  :aria-label="`Event percentile radar chart for ${selectedPlayer.name}`"
                >
                  <title>{{ `Event percentile radar chart for ${selectedPlayer.name}` }}</title>
                  <polygon
                    v-for="level in radarGridLevels"
                    :key="level"
                    class="radar-grid"
                    :points="radarGridPoints(level)"
                  />
                  <line
                    v-for="(point, index) in radarPoints"
                    :key="`${point.key}-axis`"
                    class="radar-axis"
                    :x1="radarCenter.x"
                    :y1="radarCenter.y"
                    :x2="radarAxisEnd(index).x"
                    :y2="radarAxisEnd(index).y"
                  />
                  <polygon class="radar-area" :points="radarPolygonPoints" />
                  <circle
                    v-for="point in radarPoints"
                    :key="point.key"
                    class="radar-point"
                    :cx="point.x"
                    :cy="point.y"
                    r="4"
                  >
                    <title>{{ `${point.label}: ${point.percent}%` }}</title>
                  </circle>
                  <g
                    v-for="point in radarPoints"
                    :key="`${point.key}-label`"
                    class="radar-label"
                    :text-anchor="point.labelAnchor"
                  >
                    <text :x="point.labelX" :y="point.labelY - 4">{{ point.label }}</text>
                    <text :x="point.labelX" :y="point.labelY + 11" class="radar-label-value">
                      {{ point.percent }}%
                    </text>
                  </g>
                </svg>
              </div>
              <p class="radar-footnote">Percentiles are based on players with a result. Faster times rank higher.</p>
            </section>
          </div>

          <dl class="stats-grid">
            <div v-for="stat in stats" :key="stat.key" class="stat-card">
              <dt>{{ stat.label }}</dt>
              <dd>
                {{ stat.key === 'height' ? formatHeight(selectedPlayer[stat.key]) : displayValue(selectedPlayer[stat.key], stat.suffix) }}
              </dd>
              <p v-if="selectedPlayerComparisons[stat.key]" class="stat-comparison">
                NFL comp: {{ selectedPlayerComparisons[stat.key] }}
              </p>
            </div>
          </dl>
          <p v-if="comparisonMessage" class="comparison-message" role="status">
            {{ comparisonMessage }}
          </p>
        </article>
      </template>
    </section>
    <p class="data-credit">Results are updated from the combine score sheet.</p>
  </main>
</template>

<style scoped>
.combine-page {
  --accent: #48c9a5;
  --accent-soft: color-mix(in srgb, var(--accent) 14%, transparent);
  width: min(100%, 1080px);
  min-height: 100vh;
  margin: 0 auto;
  padding: 3rem 1.25rem 2rem;
}

.page-header {
  position: relative;
  margin: 1.5rem 0 2rem;
  text-align: center;
}

.home-link {
  position: absolute;
  top: 0;
  left: 0;
  color: var(--color-text);
  font-size: 0.9rem;
}

.eyebrow {
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.page-header h1 {
  margin-top: 0.35rem;
  color: var(--color-heading);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 750;
  letter-spacing: -0.045em;
  line-height: 1.15;
}

.intro {
  margin-top: 0.65rem;
  color: var(--color-text);
  opacity: 0.75;
}

.results-panel {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-background-soft);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.08);
}

.view-switch {
  display: flex;
  gap: 0.5rem;
  padding: 0.8rem;
  border-bottom: 1px solid var(--color-border);
}

.view-switch button,
.secondary-button {
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
}

.view-switch button {
  padding: 0.65rem 1rem;
  font-size: 0.9rem;
  font-weight: 650;
}

.view-switch button.active {
  border-color: var(--color-border);
  background: var(--color-background);
  color: var(--color-heading);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.06);
}

.refresh-message {
  padding: 0.55rem 1rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 0.8rem;
}

.selector-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
}

.selector-row label {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--color-text);
  font-size: 0.8rem;
  font-weight: 650;
}

select {
  min-width: min(100%, 260px);
  padding: 0.7rem 2.5rem 0.7rem 0.85rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 9px;
  background: var(--color-background);
  color: var(--color-heading);
  font: inherit;
  font-size: 0.95rem;
}

.ranking-hint {
  padding-bottom: 0.65rem;
  color: var(--color-text);
  font-size: 0.82rem;
  opacity: 0.68;
}

.leaderboard {
  border-top: 1px solid var(--color-border);
}

.leaderboard-heading,
.leaderboard-row {
  display: grid;
  grid-template-columns: 5rem 1fr minmax(7rem, 0.5fr);
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1.5rem;
}

.leaderboard-heading {
  color: var(--color-text);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  opacity: 0.66;
}

.leaderboard-heading span:last-child,
.event-result {
  text-align: right;
}

.leaderboard-list {
  padding: 0;
  list-style: none;
}

.leaderboard-row {
  min-height: 4rem;
  border-top: 1px solid var(--color-border);
}

.leaderboard-row:first-child {
  border-top: 0;
}

.rank {
  color: var(--accent);
  font-size: 0.87rem;
  font-variant-numeric: tabular-nums;
  font-weight: 750;
}

.player-name {
  color: var(--color-heading);
  font-weight: 600;
}

.event-result {
  color: var(--color-heading);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.message-state,
.empty-state {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  padding: 2rem;
  color: var(--color-text);
  text-align: center;
}

.error-state {
  flex-direction: column;
}

.secondary-button {
  padding: 0.55rem 0.9rem;
  border-color: var(--color-border-hover);
  background: var(--color-background);
}

.loader {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-border-hover);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.player-selector {
  border-bottom: 1px solid var(--color-border);
}

.player-profile {
  padding: 1.5rem;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(170px, 0.65fr) minmax(0, 1.5fr);
  gap: 1.5rem;
}

.profile-identity {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 0.9rem;
}

.identity-copy {
  min-width: 0;
}

.identity-copy h2 {
  margin-top: 0.1rem;
  color: var(--color-heading);
  font-size: clamp(1.25rem, 2vw, 1.6rem);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.player-photo {
  display: grid;
  width: 100%;
  max-width: 280px;
  aspect-ratio: 3 / 4;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background:
    radial-gradient(circle at 70% 20%, rgb(255 255 255 / 0.22), transparent 38%),
    var(--accent-soft);
  color: var(--accent);
  text-decoration: none;
}

.player-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  font-size: 1.6rem;
  font-weight: 750;
  letter-spacing: 0.04em;
}

.radar-section {
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 13px;
  background: var(--color-background);
}

.radar-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 0.75rem;
}

.radar-heading h3 {
  margin-top: 0.15rem;
  color: var(--color-heading);
  font-size: 1.1rem;
  font-weight: 700;
}

.radar-note,
.radar-footnote {
  color: var(--color-text);
  font-size: 0.74rem;
  opacity: 0.65;
}

.radar-note {
  white-space: nowrap;
}

.radar-content {
  margin-top: 0.5rem;
}

.radar-chart {
  display: block;
  width: 100%;
  overflow: visible;
}

.radar-grid {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 1;
}

.radar-axis {
  stroke: var(--color-border);
  stroke-width: 1;
}

.radar-area {
  fill: color-mix(in srgb, var(--accent) 25%, transparent);
  stroke: var(--accent);
  stroke-linejoin: round;
  stroke-width: 2;
}

.radar-point {
  fill: var(--accent);
  stroke: var(--color-background);
  stroke-width: 2;
}

.radar-label {
  fill: var(--color-text);
  font-size: 10px;
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--color-background);
  stroke-linejoin: round;
  stroke-width: 3px;
}

.radar-label-value {
  fill: var(--accent);
  font-size: 10px;
  font-weight: 750;
}

.radar-footnote {
  margin-top: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 1.5rem;
  gap: 0.75rem;
}

.stat-card {
  min-height: 82px;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 11px;
  background: var(--color-background);
}

.stat-card dt {
  color: var(--color-text);
  font-size: 0.75rem;
  opacity: 0.7;
}

.stat-card dd {
  margin-top: 0.2rem;
  color: var(--color-heading);
  font-size: 1.02rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.stat-comparison {
  margin-top: 0.3rem;
  color: var(--accent);
  font-size: 0.73rem;
  line-height: 1.35;
}

.comparison-message {
  margin-top: 0.75rem;
  color: var(--color-text);
  font-size: 0.8rem;
  opacity: 0.75;
}

.data-credit {
  margin-top: 1rem;
  color: var(--color-text);
  font-size: 0.76rem;
  opacity: 0.55;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 700px) {
  .combine-page {
    padding: 1.5rem 0.85rem;
  }

  .page-header {
    margin: 2.75rem 0 1.5rem;
  }

  .home-link {
    top: -2.25rem;
  }

  .selector-row {
    align-items: flex-start;
    flex-direction: column;
    padding: 1rem;
  }

  .ranking-hint {
    padding-bottom: 0;
  }

  .leaderboard-heading,
  .leaderboard-row {
    grid-template-columns: 3rem minmax(0, 1fr) minmax(5.5rem, auto);
    gap: 0.6rem;
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .player-profile {
    padding: 1rem;
  }

  .profile-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .profile-identity {
    align-items: center;
    flex-direction: row;
  }

  .player-photo {
    width: 100px;
    max-width: 100px;
    aspect-ratio: 3 / 4;
  }

  .radar-chart {
    max-width: 400px;
    margin: 0 auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .stat-card {
    padding: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loader {
    animation-duration: 2s;
  }
}
</style>