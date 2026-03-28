<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// ── TYPES ──────────────────────────────────────────────
interface ShowMeta {
  poster: string; year: string; rated: string; runtime: string;
  genre: string; director: string; actors: string; plot: string;
  imdbRating: string; imdbVotes: string; seasons: string;
  country: string; awards: string;
}
interface Show {
  id: string;
  status: 'ip' | 'o' | 'x';
  title: string; keyword: string; medium: string;
  meta: ShowMeta | null;
}

// ── CONFIG — reuse same GS setup as WatchingList ──────
const GS_EMAIL    = import.meta.env.VITE_GS_CLIENT_EMAIL as string ?? '';
const GS_KEY      = (import.meta.env.VITE_GS_PRIVATE_KEY as string ?? '').replace(/\\n/g, '\n');
const GS_SHEET_ID = import.meta.env.VITE_GS_SHEET_ID     as string ?? '';
const GS_RANGE    = 'Watching!A:F';
const COL         = { STATUS: 0, TITLE: 1, KEYWORD: 2, MEDIUM: 3, META: 4 };
const LS_OMDB_META = 'wl_omdb_meta_v4';

// ── STATE ──────────────────────────────────────────────
const shows        = ref<Show[]>([]);
const loading      = ref(true);
const error        = ref('');

// Filters
const filterStatus  = ref<string[]>(['o', 'ip']); // default: unwatched + watching
const filterMediums = ref<string[]>([]);
const filterGenres  = ref<string[]>([]);
const filterRating  = ref<number>(0); // min IMDB rating

// Slot machine state
const phase = ref<'idle' | 'spinning' | 'reveal-medium' | 'reveal-stats' | 'reveal-title' | 'done'>('idle');
const picked = ref<Show | null>(null);

// Reel display values (what's shown while spinning)
const reelMedium  = ref('???');
const reelYear    = ref('???');
const reelRating  = ref('???');
const reelRuntime = ref('???');
const reelTitle   = ref('???');

// Slot machine reel cycling items
const mediumPool  = ['Movie', 'TV', 'Anime', 'Series', 'Film', 'Show'];
const yearPool    = Array.from({ length: 30 }, (_, i) => String(2024 - i));
const ratingPool  = Array.from({ length: 19 }, (_, i) => (5 + i * 0.3).toFixed(1));
const runtimePool = ['1h 20m','1h 45m','2h 10m','45m','22m','1h','2h 30m','30m','1h 55m'];

// ── GS AUTH ───────────────────────────────────────────
let _gsToken = ''; let _gsTokenExp = 0;
async function getGsToken(): Promise<string> {
  if (_gsToken && Date.now() < _gsTokenExp - 60_000) return _gsToken;
  const now   = Math.floor(Date.now() / 1000);
  const claim = { iss: GS_EMAIL, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now };
  const enc   = (o: object) => btoa(JSON.stringify(o)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const unsigned = `${enc({ alg:'RS256', typ:'JWT' })}.${enc(claim)}`;
  const pemBody  = GS_KEY.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g,'');
  const derBuf   = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const ck = await crypto.subtle.importKey('pkcs8', derBuf.buffer, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['sign']);
  const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', ck, new TextEncoder().encode(unsigned))))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const res = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` });
  const data = await res.json() as { access_token: string; expires_in: number };
  if (!data.access_token) throw new Error('GS auth failed');
  _gsToken = data.access_token; _gsTokenExp = Date.now() + data.expires_in * 1000;
  return _gsToken;
}

// ── FETCH ─────────────────────────────────────────────
function parseMetaField(raw: string): ShowMeta | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Record<string,string>;
    if (p.poster !== undefined) return p as unknown as ShowMeta;
    if (p.Poster !== undefined) {
      const v = (k: string) => (p[k] && p[k] !== 'N/A') ? p[k]! : '';
      return { poster:v('Poster'), year:v('Year'), rated:v('Rated'), runtime:v('Runtime'), genre:v('Genre'), director:v('Director'), actors:v('Actors'), plot:v('Plot'), imdbRating:v('imdbRating'), imdbVotes:v('imdbVotes'), seasons:v('totalSeasons'), country:v('Country'), awards:v('Awards') };
    }
  } catch { /**/ }
  return null;
}

function omdbMetaGet(title: string): ShowMeta | null {
  try { return (JSON.parse(localStorage.getItem(LS_OMDB_META) ?? '{}') as Record<string,ShowMeta>)[title] ?? null; } catch { return null; }
}

async function fetchShows() {
  loading.value = true; error.value = '';
  try {
    const token = await getGsToken();
    const res   = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GS_SHEET_ID}/values/${encodeURIComponent(GS_RANGE)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`GS read: ${res.status}`);
    const data  = await res.json() as { values?: string[][] };
    const rows  = data.values ?? [];
    shows.value = rows.slice(1).map((row, i) => {
      const title   = (row[COL.TITLE]   ?? '').trim();
      const keyword = (row[COL.KEYWORD] ?? '').trim();
      const medium  = (row[COL.MEDIUM]  ?? '').trim();
      const rawStatus = (row[COL.STATUS] ?? '').trim().toLowerCase();
      const status: Show['status'] = rawStatus === 'x' || rawStatus === 'watched' ? 'x' : rawStatus === 'ip' || rawStatus === 'watching' ? 'ip' : 'o';
      const sheetMeta = parseMetaField(row[COL.META] ?? '');
      return { id: String(i), status, title, keyword, medium, meta: sheetMeta ?? omdbMetaGet(title) };
    }).filter(s => s.title);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load';
  } finally { loading.value = false; }
}

// ── FILTER OPTIONS ────────────────────────────────────
const allMediums = computed(() => [...new Set(shows.value.map(s => s.medium).filter(Boolean))].sort());
const allGenres  = computed(() => [...new Set(shows.value.flatMap(s => (s.meta?.genre || s.keyword).split(',').map(g => g.trim())).filter(Boolean))].sort());

const eligible = computed(() => {
  return shows.value.filter(s => {
    if (filterStatus.value.length && !filterStatus.value.includes(s.status)) return false;
    if (filterMediums.value.length && !filterMediums.value.includes(s.medium)) return false;
    if (filterGenres.value.length) {
      const showGenres = (s.meta?.genre || s.keyword).split(',').map(g => g.trim());
      if (!filterGenres.value.some(g => showGenres.includes(g))) return false;
    }
    if (filterRating.value > 0) {
      const r = parseFloat(s.meta?.imdbRating ?? '0');
      if (isNaN(r) || r < filterRating.value) return false;
    }
    return true;
  });
});

// ── SLOT MACHINE ──────────────────────────────────────
let spinIntervals: ReturnType<typeof setInterval>[] = [];

function clearIntervals() { spinIntervals.forEach(clearInterval); spinIntervals = []; }

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }

// Random word pool for title reel spinning
const wordPool = [
  'THE','DARK','LAST','BLOOD','RISE','FALL','DEAD','NIGHT','FIRE','STORM',
  'BLACK','WHITE','RED','COLD','LOST','GONE','WILD','FREE','BLUE','GHOST',
  'SHADOW','HUNTER','LEGEND','QUEEN','KING','WAR','LOVE','HATE','LIFE','DEATH',
  'POWER','CHAOS','ORDER','VOID','LIGHT','EDGE','BROKEN','SILENT','HOLLOW','ECHO',
  'BRAVE','DARK','IRON','STEEL','WOLF','BLADE','STAR','MOON','SUN','SKY',
  'EPIC','BORN','ZERO','HERO','CODE','GAME','ZONE','RUSH','FURY','FATE',
];

function randomWords(n: number): string {
  return Array.from({ length: n }, () => randomFrom(wordPool)).join(' ');
}

function titleWordCount(title: string): number {
  return title.trim().split(/\s+/).length;
}

// Per-reel lock state for individual reveals
const lockedMedium  = ref(false);
const lockedYear    = ref(false);
const lockedRating  = ref(false);
const lockedRuntime = ref(false);
const lockedTitle   = ref(false);

async function spin() {
  if (eligible.value.length === 0) return;

  const winner = randomFrom(eligible.value);
  picked.value  = winner;
  phase.value   = 'spinning';
  lockedMedium.value = lockedYear.value = lockedRating.value = lockedRuntime.value = lockedTitle.value = false;
  clearIntervals();

  const wordCount = titleWordCount(winner.title);

  // All reels blazing fast — blur effect kicks in via CSS
  spinIntervals.push(setInterval(() => { reelMedium.value  = randomFrom(mediumPool); }, 30));
  spinIntervals.push(setInterval(() => { reelYear.value    = randomFrom(yearPool); }, 25));
  spinIntervals.push(setInterval(() => { reelRating.value  = randomFrom(ratingPool); }, 28));
  spinIntervals.push(setInterval(() => { reelRuntime.value = randomFrom(runtimePool); }, 32));
  spinIntervals.push(setInterval(() => { reelTitle.value   = randomWords(wordCount); }, 60));

  // Lock Medium — 1.2s
  await delay(1200);
  clearIntervals();
  reelMedium.value = winner.medium || '???';
  lockedMedium.value = true;
  phase.value = 'reveal-medium';
  spinIntervals.push(setInterval(() => { reelYear.value    = randomFrom(yearPool); }, 25));
  spinIntervals.push(setInterval(() => { reelRating.value  = randomFrom(ratingPool); }, 28));
  spinIntervals.push(setInterval(() => { reelRuntime.value = randomFrom(runtimePool); }, 32));
  spinIntervals.push(setInterval(() => { reelTitle.value   = randomWords(wordCount); }, 60));

  // Lock Year — 0.7s later
  await delay(700);
  clearIntervals();
  reelYear.value = winner.meta?.year || '????';
  lockedYear.value = true;
  spinIntervals.push(setInterval(() => { reelRating.value  = randomFrom(ratingPool); }, 28));
  spinIntervals.push(setInterval(() => { reelRuntime.value = randomFrom(runtimePool); }, 32));
  spinIntervals.push(setInterval(() => { reelTitle.value   = randomWords(wordCount); }, 60));

  // Lock Rating — 0.7s later
  await delay(700);
  clearIntervals();
  reelRating.value = winner.meta?.imdbRating || '?';
  lockedRating.value = true;
  spinIntervals.push(setInterval(() => { reelRuntime.value = randomFrom(runtimePool); }, 32));
  spinIntervals.push(setInterval(() => { reelTitle.value   = randomWords(wordCount); }, 60));

  // Lock Runtime — 0.7s later
  await delay(700);
  clearIntervals();
  reelRuntime.value = winner.meta?.runtime || '?';
  lockedRuntime.value = true;
  phase.value = 'reveal-stats';
  spinIntervals.push(setInterval(() => { reelTitle.value = randomWords(wordCount); }, 60));

  // Title word-by-word lock — 0.8s later
  await delay(800);
  clearIntervals();
  phase.value = 'reveal-title';

  const titleWords  = winner.title.trim().split(/\s+/);
  const lockedWords = new Array<string>(titleWords.length).fill('');
  let   wordIdx     = 0;

  // Spin remaining unlocked words, lock one at a time
  const lockWord = async () => {
    if (wordIdx >= titleWords.length) {
      reelTitle.value = winner.title;
      lockedTitle.value = true;
      phase.value = 'done';
      return;
    }

    // Spin remaining positions while current locks
    const spinRemaining = () => {
      const parts = titleWords.map((w, i) => {
        if (i < wordIdx) return w;           // already locked
        if (i === wordIdx) return w;          // just locked, show it
        return randomFrom(wordPool);          // still spinning
      });
      reelTitle.value = parts.join(' ');
    };

    // Lock current word
    lockedWords[wordIdx] = titleWords[wordIdx]!;
    wordIdx++;

    // Spin the rest for 400ms, then lock next word
    const interval = setInterval(spinRemaining, 60);
    await delay(450);
    clearInterval(interval);
    await lockWord();
  };

  await lockWord();
}

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function reset() {
  clearIntervals();
  phase.value   = 'idle';
  picked.value  = null;
  lockedMedium.value = lockedYear.value = lockedRating.value = lockedRuntime.value = lockedTitle.value = false;
  reelMedium.value = reelYear.value = reelRating.value = reelRuntime.value = reelTitle.value = '???';
}

function toggleFilter<T>(arr: T[], val: T) {
  const i = arr.indexOf(val);
  if (i === -1) arr.push(val); else arr.splice(i, 1);
}

const statusLabels: Record<string, string> = { ip: 'Watching', o: 'Up Next', x: 'Watched' };

onMounted(fetchShows);
</script>

<template>
  <div class="picker">

    <!-- BG grain -->
    <div class="picker-bg"></div>

    <!-- HEADER -->
    <header class="picker-header">
      <h1 class="picker-logo">What to <span class="accent">Watch?</span></h1>
      <p class="picker-sub">Can't decide? Let fate choose.</p>
    </header>

    <div v-if="loading" class="picker-loading">
      <div class="reel-spinner"></div>
      <p>Loading your list…</p>
    </div>

    <div v-else-if="error" class="picker-error">{{ error }}</div>

    <template v-else>

      <!-- FILTER PANEL -->
      <section class="filter-panel" :class="{ 'filter-panel--faded': phase !== 'idle' }">
        <div class="filter-section">
          <div class="filter-label">Status</div>
          <div class="filter-pills">
            <button
              v-for="s in ['ip','o','x']" :key="s"
              class="pill"
              :class="{ 'pill--active': filterStatus.includes(s), [`pill--${s}`]: true }"
              @click="toggleFilter(filterStatus, s)"
            >{{ statusLabels[s] }}</button>
          </div>
        </div>

        <div class="filter-section">
          <div class="filter-label">Type</div>
          <div class="filter-pills">
            <button
              v-for="m in allMediums" :key="m"
              class="pill"
              :class="{ 'pill--active': filterMediums.includes(m) }"
              @click="toggleFilter(filterMediums, m)"
            >{{ m }}</button>
          </div>
        </div>

        <div class="filter-section">
          <div class="filter-label">Genre</div>
          <div class="filter-pills filter-pills--wrap">
            <button
              v-for="g in allGenres" :key="g"
              class="pill pill--sm"
              :class="{ 'pill--active': filterGenres.includes(g) }"
              @click="toggleFilter(filterGenres, g)"
            >{{ g }}</button>
          </div>
        </div>

        <div class="filter-section filter-section--row">
          <div class="filter-label">Min Rating</div>
          <div class="rating-slider-wrap">
            <input type="range" min="0" max="9" step="0.5" v-model.number="filterRating" class="rating-slider" />
            <span class="rating-val">{{ filterRating > 0 ? `★ ${filterRating}+` : 'Any' }}</span>
          </div>
        </div>

        <div class="filter-count">
          <span class="filter-count-n">{{ eligible.length }}</span> titles eligible
        </div>
      </section>

      <!-- SLOT MACHINE -->
      <section class="slot-machine" :class="`slot-machine--${phase}`">

        <!-- Decorative side lights -->
        <div class="slot-lights slot-lights--left">
          <span v-for="i in 6" :key="i" class="slot-light" :style="{ animationDelay: `${i * 0.18}s` }"></span>
        </div>
        <div class="slot-lights slot-lights--right">
          <span v-for="i in 6" :key="i" class="slot-light" :style="{ animationDelay: `${i * 0.18 + 0.09}s` }"></span>
        </div>

        <div class="slot-cabinet">
          <div class="slot-reels">

            <!-- MEDIUM reel -->
            <div class="reel" :class="{ 'reel--locked': lockedMedium }">
              <div class="reel-label">TYPE</div>
              <div class="reel-window">
                <div class="reel-scan"></div>
                <span class="reel-value"
                  :class="{
                    'reel-value--blur': !lockedMedium && phase !== 'idle',
                    'reel-value--locked': lockedMedium
                  }">
                  {{ reelMedium }}
                </span>
              </div>
            </div>

            <!-- YEAR reel -->
            <div class="reel reel--sm" :class="{ 'reel--locked': lockedYear }">
              <div class="reel-label">YEAR</div>
              <div class="reel-window">
                <div class="reel-scan"></div>
                <span class="reel-value reel-value--sm"
                  :class="{
                    'reel-value--blur': !lockedYear && phase !== 'idle',
                    'reel-value--locked': lockedYear
                  }">
                  {{ reelYear }}
                </span>
              </div>
            </div>

            <!-- RATING reel -->
            <div class="reel reel--sm" :class="{ 'reel--locked': lockedRating }">
              <div class="reel-label">IMDB</div>
              <div class="reel-window">
                <div class="reel-scan"></div>
                <span class="reel-value reel-value--sm"
                  :class="{
                    'reel-value--blur': !lockedRating && phase !== 'idle',
                    'reel-value--locked': lockedRating
                  }">
                  {{ reelRating }}
                </span>
              </div>
            </div>

            <!-- RUNTIME reel -->
            <div class="reel reel--sm" :class="{ 'reel--locked': lockedRuntime }">
              <div class="reel-label">LENGTH</div>
              <div class="reel-window">
                <div class="reel-scan"></div>
                <span class="reel-value reel-value--sm"
                  :class="{
                    'reel-value--blur': !lockedRuntime && phase !== 'idle',
                    'reel-value--locked': lockedRuntime
                  }">
                  {{ reelRuntime }}
                </span>
              </div>
            </div>

            <!-- TITLE reel -->
            <div class="reel reel--title" :class="{ 'reel--locked': lockedTitle }">
              <div class="reel-label">TITLE</div>
              <div class="reel-window reel-window--title">
                <div class="reel-scan"></div>
                <span class="reel-value reel-value--title"
                  :class="{
                    'reel-value--blur': !lockedTitle && phase !== 'idle' && phase !== 'reveal-title',
                    'reel-value--locking': phase === 'reveal-title',
                    'reel-value--locked': lockedTitle
                  }">
                  {{ reelTitle }}
                </span>
              </div>
            </div>

          </div>

          <!-- SPIN BUTTON -->
          <div class="slot-controls">
            <button
              v-if="phase === 'idle'"
              class="spin-btn"
              :disabled="eligible.length === 0"
              @click="spin"
            >
              <span class="spin-btn-text">SPIN</span>
              <span class="spin-btn-sub">{{ eligible.length }} options</span>
            </button>

            <div v-else-if="phase !== 'done'" class="spinning-indicator">
              <span class="spinning-dot"></span>
              <span class="spinning-dot"></span>
              <span class="spinning-dot"></span>
            </div>

            <div v-else class="result-controls">
              <button class="again-btn" @click="reset">↺ Spin Again</button>
            </div>
          </div>
        </div>

      </section>

      <!-- RESULT CARD — shown after done -->
      <transition name="result-slide">
        <section v-if="phase === 'done' && picked" class="result-card">
          <div class="result-poster-col">
            <img v-if="picked.meta?.poster" :src="picked.meta.poster" :alt="picked.title" class="result-poster" @error="($event.target as HTMLImageElement).style.display='none'" />
            <div v-else class="result-poster-placeholder">{{ picked.title.charAt(0) }}</div>
          </div>
          <div class="result-info">
            <div class="result-badges">
              <span class="result-badge result-badge--medium">{{ picked.medium }}</span>
              <span v-if="picked.meta?.rated" class="result-badge result-badge--rated">{{ picked.meta.rated }}</span>
              <span v-if="picked.meta?.year" class="result-badge">{{ picked.meta.year }}</span>
            </div>
            <h2 class="result-title">{{ picked.title }}</h2>
            <div v-if="picked.meta?.imdbRating" class="result-rating">
              <span class="result-star">★</span>
              <span class="result-rating-n">{{ picked.meta.imdbRating }}</span>
              <span class="result-rating-sub">/10 IMDb</span>
            </div>
            <div class="result-chips">
              <span v-if="picked.meta?.runtime" class="result-chip">{{ picked.meta.runtime }}</span>
              <span v-if="picked.meta?.seasons" class="result-chip">{{ picked.meta.seasons }} seasons</span>
              <span v-for="g in (picked.meta?.genre || picked.keyword).split(',').slice(0,3)" :key="g" class="result-chip">{{ g.trim() }}</span>
            </div>
            <p v-if="picked.meta?.plot" class="result-plot">{{ picked.meta.plot }}</p>
            <div class="result-detail-rows">
              <div v-if="picked.meta?.director" class="result-row"><span class="result-lbl">Director</span><span>{{ picked.meta.director }}</span></div>
              <div v-if="picked.meta?.actors"   class="result-row"><span class="result-lbl">Cast</span><span>{{ picked.meta.actors }}</span></div>
              <div v-if="picked.meta?.awards"   class="result-row"><span class="result-lbl">Awards</span><span>{{ picked.meta.awards }}</span></div>
            </div>
            <div class="result-actions">
              <button class="again-btn again-btn--inline" @click="reset">↺ Pick Again</button>
            </div>
          </div>
        </section>
      </transition>

    </template>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap');

:root {
  --bg:        #07080d;
  --surface:   #0f1018;
  --surface2:  #181920;
  --border:    #252630;
  --text:      #e0e0f0;
  --dim:       #55556a;
  --accent:    #ff3c5f;
  --gold:      #ffd700;
  --cyan:      #00e5ff;
  --green:     #00ff88;
  --mono:      'Share Tech Mono', monospace;
  --display:   'Bebas Neue', sans-serif;
  --body:      'Outfit', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.picker {
  font-family: var(--body);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
  position: relative;
  padding-bottom: 6rem;
}

/* GRAIN BACKGROUND */
.picker-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 200px;
  opacity: 0.6;
}

/* HEADER */
.picker-header { text-align: center; padding: 3.5rem 2rem 1.5rem; position: relative; z-index: 1; }
.picker-logo { font-family: var(--display); font-size: clamp(2.5rem, 7vw, 5rem); letter-spacing: 0.04em; line-height: 1; color: var(--text); }
.accent { color: var(--accent); }
.picker-sub { font-size: 0.9rem; color: var(--dim); margin-top: 0.5rem; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.75rem; }

.picker-loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 8rem 2rem; color: var(--dim); }
.picker-error   { text-align: center; padding: 4rem; color: var(--accent); }

.reel-spinner {
  width: 40px; height: 40px; border: 3px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── FILTER PANEL ── */
.filter-panel {
  max-width: 960px; margin: 0 auto 3rem; padding: 2rem 2.5rem;
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  position: relative; z-index: 1;
  transition: opacity 0.4s, filter 0.4s;
  display: flex; flex-direction: column; gap: 1.5rem;
}
.filter-panel--faded { opacity: 0.35; pointer-events: none; filter: blur(1px); }

.filter-section { display: flex; flex-direction: column; gap: 0.6rem; }
.filter-section--row { flex-direction: row; align-items: center; gap: 1.5rem; }
.filter-label { font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.12em; color: var(--dim); text-transform: uppercase; }

.filter-pills { display: flex; gap: 0.45rem; flex-wrap: wrap; }
.filter-pills--wrap { max-height: 120px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }

.pill {
  background: var(--surface2); border: 1px solid var(--border); color: var(--dim);
  border-radius: 99px; padding: 0.35rem 0.9rem; font-size: 0.78rem;
  font-family: var(--body); cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.pill--sm { padding: 0.25rem 0.7rem; font-size: 0.72rem; }
.pill:hover { border-color: var(--text); color: var(--text); }
.pill--active          { background: rgba(255,60,95,0.12); border-color: var(--accent); color: var(--accent); }
.pill--active.pill--ip { background: rgba(245,158,11,0.12); border-color: #f59e0b; color: #f59e0b; }
.pill--active.pill--o  { background: rgba(156,163,175,0.12); border-color: #9ca3af; color: #d1d5db; }
.pill--active.pill--x  { background: rgba(16,185,129,0.12); border-color: #10b981; color: #10b981; }

.rating-slider-wrap { display: flex; align-items: center; gap: 1rem; flex: 1; }
.rating-slider {
  -webkit-appearance: none; flex: 1; height: 4px; border-radius: 99px;
  background: var(--border); outline: none; cursor: pointer;
}
.rating-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
  background: var(--accent); cursor: pointer; border: 2px solid var(--bg);
  box-shadow: 0 0 8px rgba(255,60,95,0.5);
}
.rating-val { font-family: var(--mono); font-size: 0.82rem; color: var(--gold); min-width: 60px; }

.filter-count { text-align: center; font-size: 0.8rem; color: var(--dim); padding-top: 0.5rem; border-top: 1px solid var(--border); }
.filter-count-n { font-family: var(--display); font-size: 1.4rem; color: var(--cyan); vertical-align: middle; margin-right: 0.3rem; }

/* ── SLOT MACHINE ── */
.slot-machine {
  max-width: 960px; margin: 0 auto 3rem;
  position: relative; z-index: 1;
  padding: 0 2rem;
}

/* Side lights */
.slot-lights {
  position: absolute; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 12px; z-index: 2;
}
.slot-lights--left  { left: 0; }
.slot-lights--right { right: 0; }
.slot-light {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--dim); border: 1px solid var(--border);
  animation: none;
}
.slot-machine--spinning .slot-light,
.slot-machine--reveal-medium .slot-light,
.slot-machine--reveal-stats .slot-light,
.slot-machine--reveal-title .slot-light,
.slot-machine--done .slot-light {
  animation: blink 0.4s ease-in-out infinite alternate;
}
@keyframes blink {
  from { background: var(--dim); box-shadow: none; }
  to   { background: var(--gold); box-shadow: 0 0 8px var(--gold); }
}

.slot-cabinet {
  background: linear-gradient(180deg, #141520 0%, #0d0e16 100%);
  border: 2px solid var(--border);
  border-radius: 20px;
  padding: 2rem 2.5rem 2.5rem;
  box-shadow: 0 0 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04);
  position: relative;
}
.slot-cabinet::before {
  content: '';
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 60%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 99px;
}

.slot-reels {
  display: flex; gap: 1rem; align-items: stretch; margin-bottom: 2rem;
}

/* ── REEL ── */
.reel {
  display: flex; flex-direction: column; gap: 0.5rem; flex: 1;
  transition: filter 0.3s;
}
.reel--sm    { flex: 0.7; }
.reel--title { flex: 2.5; }
.reel--locked { filter: drop-shadow(0 0 10px var(--gold)); }

.reel-label {
  font-family: var(--mono); font-size: 0.6rem; letter-spacing: 0.14em;
  color: var(--dim); text-align: center; text-transform: uppercase;
}

.reel-window {
  background: #08090f;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem 0.5rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 80px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
}
.reel-window--title { min-height: 80px; padding: 1rem; }

/* Scan line */
.reel-scan {
  position: absolute; top: 0; left: 0; right: 0;
  height: 100%;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.02) 0%,
    transparent 40%,
    transparent 60%,
    rgba(255,255,255,0.02) 100%
  );
  pointer-events: none;
}
.reel-window::after {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px);
  pointer-events: none;
}

.reel-value {
  font-family: var(--mono); font-size: 1.4rem; font-weight: 700;
  color: var(--text); letter-spacing: 0.05em;
  position: relative; z-index: 1; word-break: break-all; line-height: 1.2;
}
.reel-value--sm    { font-size: 1.1rem; }
.reel-value--title { font-size: 1.3rem; letter-spacing: 0.06em; }

.reel-value--blur {
  color: var(--cyan);
  text-shadow: 0 0 8px var(--cyan);
  filter: blur(2.5px) brightness(1.3);
  animation: flicker 0.03s linear infinite;
}
.reel-value--locking {
  color: var(--gold);
  text-shadow: 0 0 16px var(--gold);
  filter: blur(0.5px);
  animation: flicker 0.08s linear infinite;
}
.reel-value--locked {
  color: var(--gold);
  text-shadow: 0 0 20px rgba(255,215,0,0.6);
  filter: none;
  animation: none;
}
@keyframes flicker {
  0%,100% { opacity: 1; }
  50% { opacity: 0.85; }
}

/* Controls */
.slot-controls { display: flex; justify-content: center; }

.spin-btn {
  background: linear-gradient(135deg, var(--accent), #c0003a);
  border: none; border-radius: 12px;
  padding: 1rem 3.5rem;
  cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  transition: transform 0.1s, box-shadow 0.2s;
  box-shadow: 0 4px 30px rgba(255,60,95,0.4);
  position: relative; overflow: hidden;
}
.spin-btn::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%);
  pointer-events: none;
}
.spin-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(255,60,95,0.6); }
.spin-btn:active:not(:disabled) { transform: scale(0.97); }
.spin-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
.spin-btn-text { font-family: var(--display); font-size: 2rem; letter-spacing: 0.15em; color: #fff; line-height: 1; }
.spin-btn-sub  { font-family: var(--mono); font-size: 0.65rem; color: rgba(255,255,255,0.6); letter-spacing: 0.08em; }

.spinning-indicator { display: flex; gap: 0.6rem; align-items: center; padding: 1rem; }
.spinning-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent);
  animation: bounce 0.6s ease-in-out infinite alternate;
}
.spinning-dot:nth-child(2) { animation-delay: 0.15s; background: var(--gold); }
.spinning-dot:nth-child(3) { animation-delay: 0.30s; background: var(--cyan); }
@keyframes bounce { from { transform: translateY(0); opacity: 0.4; } to { transform: translateY(-8px); opacity: 1; } }

.again-btn {
  background: var(--surface2); border: 1px solid var(--border); color: var(--dim);
  border-radius: 8px; padding: 0.6rem 1.5rem; font-family: var(--body); font-size: 0.88rem;
  cursor: pointer; transition: all 0.15s;
}
.again-btn:hover { border-color: var(--text); color: var(--text); }
.again-btn--inline { margin-top: 0.5rem; }

/* ── RESULT CARD ── */
.result-slide-enter-active { transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.result-slide-enter-from   { opacity: 0; transform: translateY(40px); }

.result-card {
  max-width: 960px; margin: 0 auto;
  padding: 0 2rem;
  display: grid; grid-template-columns: 240px 1fr;
  gap: 0; position: relative; z-index: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 0 80px rgba(255,215,0,0.08);
}

.result-poster-col { flex-shrink: 0; overflow: hidden; }
.result-poster { width: 100%; height: 100%; object-fit: cover; display: block; min-height: 360px; }
.result-poster-placeholder {
  width: 100%; min-height: 360px; display: flex; align-items: center; justify-content: center;
  font-family: var(--display); font-size: 7rem; color: var(--dim); background: var(--surface2);
}

.result-info { padding: 2.5rem; display: flex; flex-direction: column; gap: 1.1rem; }

.result-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.result-badge { font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; background: var(--surface2); color: var(--dim); border: 1px solid var(--border); }
.result-badge--medium { background: rgba(255,60,95,0.12); color: var(--accent); border-color: rgba(255,60,95,0.3); }
.result-badge--rated  { background: rgba(255,215,0,0.1); color: var(--gold); border-color: rgba(255,215,0,0.25); }

.result-title { font-family: var(--display); font-size: 2.6rem; letter-spacing: 0.03em; color: var(--text); line-height: 1.05; }

.result-rating { display: flex; align-items: baseline; gap: 0.35rem; }
.result-star { font-size: 1.2rem; color: var(--gold); }
.result-rating-n { font-family: var(--display); font-size: 2.2rem; color: var(--gold); line-height: 1; }
.result-rating-sub { font-size: 0.8rem; color: var(--dim); }
.result-votes { font-size: 0.72rem; color: var(--dim); margin-left: 0.25rem; }

.result-chips { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.result-chip { font-family: var(--mono); font-size: 0.72rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 0.2rem 0.55rem; color: var(--dim); }

.result-plot { font-size: 0.9rem; line-height: 1.68; color: var(--text); opacity: 0.85; border-left: 2px solid var(--border); padding-left: 0.9rem; }

.result-detail-rows { display: flex; flex-direction: column; gap: 0.45rem; }
.result-row { display: flex; gap: 0.65rem; font-size: 0.82rem; line-height: 1.5; }
.result-lbl { color: var(--dim); min-width: 72px; flex-shrink: 0; font-weight: 500; }

.result-actions { margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border); }

/* ── RESPONSIVE ── */
@media (max-width: 760px) {
  .filter-panel { padding: 1.5rem; }
  .slot-cabinet { padding: 1.5rem 1.25rem 1.75rem; }
  .slot-reels   { gap: 0.6rem; }
  .reel--sm     { flex: 0.6; }
  .reel-value   { font-size: 1.1rem; }
  .reel-value--sm { font-size: 0.9rem; }
  .reel-value--title { font-size: 1rem; }
  .slot-lights  { display: none; }
  .result-card  { grid-template-columns: 1fr; }
  .result-poster-col { max-height: 260px; }
  .result-poster { object-position: center 20%; min-height: unset; }
  .result-poster-placeholder { min-height: 200px; }
  .result-info  { padding: 1.5rem; }
  .result-title { font-size: 2rem; }
}

@media (max-width: 500px) {
  .slot-reels { flex-wrap: wrap; }
  .reel--title { flex: 1 0 100%; }
  .reel        { flex: 1 0 calc(50% - 0.3rem); }
  .reel--sm    { flex: 1 0 calc(50% - 0.3rem); }
}
</style>