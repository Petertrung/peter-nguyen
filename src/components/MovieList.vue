<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router'
const router = useRouter()

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
type StatusKey = 'ip' | 'o' | 'x';

// ── CONFIG ────────────────────────────────────────────
const OMDB_KEY    = import.meta.env.VITE_OMDB_API_KEY    as string ?? '';
const GS_EMAIL    = import.meta.env.VITE_GS_CLIENT_EMAIL as string ?? '';
const GS_KEY      = (import.meta.env.VITE_GS_PRIVATE_KEY as string ?? '').replace(/\\n/g, '\n');
const GS_SHEET_ID = import.meta.env.VITE_GS_SHEET_ID     as string ?? '';
const GS_TAB      = 'Watching';
const GS_RANGE    = 'Watching!A:F';
// Column indices (0-based in array, A=0)
const COL = { STATUS: 0, TITLE: 1, KEYWORD: 2, MEDIUM: 3, META: 4 };

const LS_OMDB_COUNT = 'wl_omdb_day_v4';
const LS_OMDB_META  = 'wl_omdb_meta_v4'; // local OMDB cache only — no show list cache
const OMDB_LIMIT    = 950;

// ── STATE ──────────────────────────────────────────────
const shows        = ref<Show[]>([]);
const loading      = ref(true);
const error        = ref('');
const activeFilter = ref<StatusKey | 'all'>('all');
const activeGenre  = ref('all');
const activeMedium = ref('all');
const searchQuery  = ref('');
const modalShow    = ref<Show | null>(null);
const addModalOpen = ref(false);
const enriching    = ref(false);
const enrichMsg    = ref('');
const omdbToday    = ref(0);
const newShow      = ref({ status: 'o' as StatusKey, title: '', keyword: '', medium: 'TV' });
const saving       = ref(false);
const saveMsg      = ref('');

// ── OMDB LOCAL CACHE (posters only, no show list) ─────
function omdbMetaGet(title: string): ShowMeta | null {
  try { return (JSON.parse(localStorage.getItem(LS_OMDB_META) ?? '{}') as Record<string, ShowMeta>)[title] ?? null; } catch { return null; }
}
function omdbMetaSet(title: string, meta: ShowMeta) {
  try {
    const m = JSON.parse(localStorage.getItem(LS_OMDB_META) ?? '{}') as Record<string, ShowMeta>;
    m[title] = meta;
    localStorage.setItem(LS_OMDB_META, JSON.stringify(m));
  } catch { /**/ }
}

// ── OMDB DAILY COUNTER ────────────────────────────────
function getCount(): number {
  try {
    const r = localStorage.getItem(LS_OMDB_COUNT);
    if (!r) return 0;
    const { count, date }: { count: number; date: string } = JSON.parse(r);
    if (date !== new Date().toISOString().slice(0, 10)) { localStorage.removeItem(LS_OMDB_COUNT); return 0; }
    return count;
  } catch { return 0; }
}
function bumpCount() {
  const n = getCount() + 1;
  localStorage.setItem(LS_OMDB_COUNT, JSON.stringify({ count: n, date: new Date().toISOString().slice(0, 10) }));
  omdbToday.value = n;
}
const atLimit = () => getCount() >= OMDB_LIMIT;

// ── GOOGLE SHEETS JWT AUTH ────────────────────────────
let _gsToken = '';
let _gsTokenExp = 0;

async function getGsToken(): Promise<string> {
  if (_gsToken && Date.now() < _gsTokenExp - 60_000) return _gsToken;
  const now    = Math.floor(Date.now() / 1000);
  const claim  = { iss: GS_EMAIL, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now };
  const enc    = (o: object) => btoa(JSON.stringify(o)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const header = enc({ alg: 'RS256', typ: 'JWT' });
  const payload = enc(claim);
  const unsigned = `${header}.${payload}`;
  const pemBody  = GS_KEY.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const derBuf   = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('pkcs8', derBuf.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf   = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));
  const sig      = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const res      = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}`,
  });
  const data = await res.json() as { access_token: string; expires_in: number };
  if (!data.access_token) throw new Error('GS auth failed: ' + JSON.stringify(data));
  _gsToken    = data.access_token;
  _gsTokenExp = Date.now() + data.expires_in * 1000;
  return _gsToken;
}

// ── GOOGLE SHEETS: READ ALL ROWS ──────────────────────
async function gsRead(): Promise<string[][]> {
  const token = await getGsToken();
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GS_SHEET_ID}/values/${encodeURIComponent(GS_RANGE)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`GS read: ${res.status} ${await res.text()}`);
  const data = await res.json() as { values?: string[][] };
  return data.values ?? [];
}

// ── GOOGLE SHEETS: FIND ROW BY TITLE (live lookup) ───
// Returns the 1-based sheet row number, or null if not found
async function gsFindRowByTitle(title: string): Promise<number | null> {
  const rows = await gsRead();
  // Skip header row (index 0), data starts at index 1 = sheet row 2
  const idx = rows.slice(1).findIndex(row => (row[COL.TITLE] ?? '').trim().toLowerCase() === title.trim().toLowerCase());
  if (idx === -1) return null;
  return idx + 2; // +1 for 0-based→1-based, +1 for skipped header
}

// ── GOOGLE SHEETS: UPDATE A CELL ─────────────────────
async function gsUpdateCell(sheetRow: number, colIndex: number, value: string): Promise<void> {
  const token = await getGsToken();
  const col   = String.fromCharCode(65 + colIndex); // 0→A, 1→B …
  const range = `${GS_TAB}!${col}${sheetRow}`;
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GS_SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[value]] }),
    }
  );
  if (!res.ok) throw new Error(`GS update [${range}]: ${res.status} ${await res.text()}`);
}

// ── GOOGLE SHEETS: APPEND ROW ─────────────────────────
async function gsAppendRow(values: string[]): Promise<void> {
  const token = await getGsToken();
  const res   = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${GS_SHEET_ID}/values/${encodeURIComponent(GS_TAB)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] }),
    }
  );
  if (!res.ok) throw new Error(`GS append: ${res.status} ${await res.text()}`);
}

// ── META HELPERS ──────────────────────────────────────
function parseMeta(d: Record<string, string>): ShowMeta {
  const v = (k: string) => (d[k] && d[k] !== 'N/A') ? d[k]! : '';
  return { poster: v('Poster'), year: v('Year'), rated: v('Rated'), runtime: v('Runtime'), genre: v('Genre'), director: v('Director'), actors: v('Actors'), plot: v('Plot'), imdbRating: v('imdbRating'), imdbVotes: v('imdbVotes'), seasons: v('totalSeasons'), country: v('Country'), awards: v('Awards') };
}
function parseMetaField(raw: string): ShowMeta | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Record<string, string>;
    if (p.poster  !== undefined) return p as unknown as ShowMeta;
    if (p.Poster  !== undefined) return parseMeta(p);
  } catch { /**/ }
  return null;
}

// ── OMDB ─────────────────────────────────────────────
async function callOmdb(title: string, medium: string): Promise<Record<string, string> | null> {
  if (!OMDB_KEY || atLimit()) return null;
  const type = medium.toLowerCase() === 'movie' ? 'movie' : 'series';
  const res  = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&type=${type}&plot=full&apikey=${OMDB_KEY}`);
  const data = await res.json() as Record<string, string>;
  bumpCount();
  return data.Response === 'False' ? null : data;
}

// ── FETCH SHOWS (always live from sheet) ──────────────
async function fetchShows(force = false) {
  loading.value = true; error.value = ''; omdbToday.value = getCount();
  try {
    const rows  = await gsRead();
    console.log('[WL] headers:', rows[0], '| rows:', rows.length - 1);
    shows.value = rows.slice(1).map((row, i) => {
      const title   = (row[COL.TITLE]   ?? '').trim();
      const keyword = (row[COL.KEYWORD] ?? '').trim();
      const medium  = (row[COL.MEDIUM]  ?? '').trim();
      const sheetMeta = parseMetaField(row[COL.META] ?? '');
      const meta      = sheetMeta ?? omdbMetaGet(title);
      return {
        id:     String(i),
        status: normalizeStatus(row[COL.STATUS] ?? ''),
        title,
        keyword,
        medium,
        meta,
      };
    }).filter(s => s.title);

    if (OMDB_KEY) enrichMissing();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load';
    console.error('[WL] fetchShows:', e);
  } finally { loading.value = false; }
}

function normalizeStatus(raw: string): StatusKey {
  const v = raw.trim().toLowerCase();
  if (v === 'ip' || v === 'watching') return 'ip';
  if (v === 'x'  || v === 'watched')  return 'x';
  return 'o';
}

// ── UPDATE STATUS (live row lookup, no cached index) ──
async function updateStatus(show: Show, newStatus: StatusKey) {
  const prev = show.status;
  // Optimistic update in UI
  show.status = newStatus;
  if (modalShow.value?.id === show.id) modalShow.value.status = newStatus;
  try {
    // Always look up the current row by title — never trust a cached index
    const sheetRow = await gsFindRowByTitle(show.title);
    if (!sheetRow) throw new Error(`"${show.title}" not found in sheet`);
    await gsUpdateCell(sheetRow, COL.STATUS, newStatus);
    console.log('[WL] ✓ status saved:', show.title, '→', newStatus, `(row ${sheetRow})`);
  } catch (e) {
    console.error('[WL] updateStatus failed:', e);
    // Revert on failure
    show.status = prev;
    if (modalShow.value?.id === show.id) modalShow.value.status = prev;
  }
}

// ── ENRICH META ───────────────────────────────────────
async function enrichMissing() {
  if (!OMDB_KEY) return;
  const missing = shows.value.filter(s => !s.meta || !s.meta.poster);
  console.log('[WL] enrichMissing:', missing.length, 'shows');
  if (!missing.length) return;
  if (atLimit()) { enrichMsg.value = `Daily OMDB limit reached (${omdbToday.value}/${OMDB_LIMIT}).`; return; }

  enriching.value = true;
  for (let i = 0; i < missing.length; i++) {
    if (atLimit()) { enrichMsg.value = `OMDB limit reached (${omdbToday.value}/${OMDB_LIMIT}). Continues tomorrow.`; break; }
    const show = missing[i]!;
    enrichMsg.value = `Fetching ${i + 1}/${missing.length}: "${show.title}"`;
    try {
      const data = await callOmdb(show.title, show.medium);
      const meta = data
        ? parseMeta(data)
        : { poster: '', year: '', rated: '', runtime: '', genre: '', director: '', actors: '', plot: '', imdbRating: '', imdbVotes: '', seasons: '', country: '', awards: '' };
      show.meta = meta;
      // Cache locally
      if (meta.poster) omdbMetaSet(show.title, meta);
      console.log('[WL] enriched:', show.title, '| poster:', !!meta.poster, `(${omdbToday.value}/${OMDB_LIMIT})`);
      // Write to sheet — look up row live
      const sheetRow = await gsFindRowByTitle(show.title);
      if (sheetRow) await gsUpdateCell(sheetRow, COL.META, JSON.stringify(meta));
    } catch (e) { console.warn('[WL] enrich failed:', show.title, e); }
  }
  enriching.value = false; enrichMsg.value = '';
}

// ── ADD SHOW ──────────────────────────────────────────
async function addShow() {
  if (!newShow.value.title.trim()) return;
  saving.value = true; saveMsg.value = '';
  try {
    let meta: ShowMeta | null = null;
    if (OMDB_KEY && !atLimit()) {
      const data = await callOmdb(newShow.value.title, newShow.value.medium).catch(() => null);
      if (data) {
        meta = parseMeta(data);
        if (!newShow.value.keyword && meta.genre) newShow.value.keyword = meta.genre.split(',')[0]?.trim() ?? '';
        if (meta.poster) omdbMetaSet(newShow.value.title, meta);
      }
    }
    const row = ['', '', '', '', ''];
    row[COL.STATUS]  = newShow.value.status;
    row[COL.TITLE]   = newShow.value.title;
    row[COL.KEYWORD] = newShow.value.keyword;
    row[COL.MEDIUM]  = newShow.value.medium;
    row[COL.META]    = meta ? JSON.stringify(meta) : '';
    await gsAppendRow(row);
    // Add to local list immediately, rowIndex not needed since we always look up live
    shows.value.push({ id: String(Date.now()), status: newShow.value.status, title: newShow.value.title, keyword: newShow.value.keyword, medium: newShow.value.medium, meta });
    saveMsg.value = '✓ Added!';
    newShow.value = { status: 'o', title: '', keyword: '', medium: 'TV' };
    setTimeout(() => { addModalOpen.value = false; saveMsg.value = ''; }, 1200);
  } catch (e) { console.error('[WL] addShow:', e); saveMsg.value = '✗ Failed to save'; }
  finally { saving.value = false; }
}

function forceRefresh() { fetchShows(true); }

// ── FILTERS + COMPUTED ────────────────────────────────
const genres  = computed(() => ['all', ...Array.from(new Set(shows.value.map(s => s.keyword).filter(Boolean))).sort()]);
const mediums = computed(() => ['all', ...Array.from(new Set(shows.value.map(s => s.medium).filter(Boolean))).sort()]);
const filtered = computed(() => shows.value.filter(s => {
  if (activeFilter.value !== 'all' && s.status  !== activeFilter.value) return false;
  if (activeGenre.value  !== 'all' && s.keyword !== activeGenre.value)  return false;
  if (activeMedium.value !== 'all' && s.medium  !== activeMedium.value) return false;
  if (searchQuery.value  && !s.title.toLowerCase().includes(searchQuery.value.toLowerCase())) return false;
  return true;
}));
const inProgress = computed(() => filtered.value.filter(s => s.status === 'ip'));
const unwatched  = computed(() => filtered.value.filter(s => s.status === 'o'));
const watched    = computed(() => filtered.value.filter(s => s.status === 'x'));
const stats = computed(() => ({
  total:    shows.value.length,
  watching: shows.value.filter(s => s.status === 'ip').length,
  watched:  shows.value.filter(s => s.status === 'x').length,
  upNext:   shows.value.filter(s => s.status === 'o').length,
}));
const statusMap: { key: StatusKey; label: string; color: string; icon: string }[] = [
  { key: 'ip', label: 'Watching', color: '#f59e0b', icon: '▶' },
  { key: 'o',  label: 'Up Next',  color: '#9ca3af', icon: '○' },
  { key: 'x',  label: 'Watched',  color: '#10b981', icon: '✓' },
];
function ratingColor(r: string): string {
  const n = parseFloat(r);
  if (isNaN(n)) return 'var(--dim)';
  return n >= 8 ? '#f59e0b' : n >= 6.5 ? '#10b981' : '#9ca3af';
}

onMounted(() => {
  console.log('[WL] Sheet ID:', GS_SHEET_ID, '| OMDB:', !!OMDB_KEY);
  fetchShows();
});
</script>

<template>
  <div class="wl">

    <!-- HEADER -->
    <header class="wl-header">
      <div class="wl-inner">
        <div class="wl-header-row">
          <div class="logo">
            <span class="logo-icon">▣</span>
            <span class="logo-text">Our List</span>
          </div>
          <div class="header-stats" v-if="!loading">
            <div class="hstat"><span class="hstat-n">{{ stats.total }}</span><span class="hstat-l">Total</span></div>
            <div class="hstat hstat--watching"><span class="hstat-n">{{ stats.watching }}</span><span class="hstat-l">Watching</span></div>
            <div class="hstat hstat--watched"><span class="hstat-n">{{ stats.watched }}</span><span class="hstat-l">Watched</span></div>
            <div class="hstat"><span class="hstat-n">{{ stats.upNext }}</span><span class="hstat-l">Up Next</span></div>
          </div>
          <div class="header-right">
            <span v-if="enriching" class="enrich-hint">
              <span class="spinner spinner--xs"></span> {{ enrichMsg || 'Enriching…' }}
            </span>
            <span v-else-if="OMDB_KEY" class="api-counter">{{ omdbToday }}/{{ OMDB_LIMIT }} API calls today</span>
            <button class="refresh-btn" @click="forceRefresh" title="Clear cache & reload from sheet">↺</button>
            <button class="add-btn" @click="addModalOpen = true">+ Add</button>
          </div>
        </div>
        <div class="wl-filters">
          <div class="search-wrap">
            <span class="search-icon">⌕</span>
            <input v-model="searchQuery" class="search-input" placeholder="Search titles…" />
          </div>
          <div class="filter-chips">
            <button
              v-for="f in ([['all','All'],['ip','Watching'],['o','Up Next'],['x','Watched']] as [string,string][])"
              :key="f[0]" class="chip"
              :class="{ 'chip--active': activeFilter === f[0], [`chip--${f[0]}`]: true }"
              @click="activeFilter = f[0] as typeof activeFilter"
            >{{ f[1] }}</button>
          </div>
          <select v-model="activeGenre"  class="wl-select"><option v-for="g in genres"  :key="g" :value="g">{{ g === 'all' ? 'All Genres' : g }}</option></select>
          <select v-model="activeMedium" class="wl-select"><option v-for="m in mediums" :key="m" :value="m">{{ m === 'all' ? 'All Types' : m }}</option></select>
        </div>
      </div>
    </header>

    <div v-if="loading" class="wl-loading"><div class="spinner"></div><p>Loading…</p></div>
    <div v-else-if="error" class="wl-error"><p>{{ error }}</p><button @click="fetchShows(true)" class="retry-btn">Retry</button></div>

    <main v-else class="wl-main">
      <div class="wl-inner">

        <button class="btn random" v-on:click="() =>{ router.push('/pick')}">Randomizer</button>

        <section v-if="inProgress.length" class="row-section">
          <h2 class="row-title"><span class="row-dot row-dot--ip"></span>Currently Watching</h2>
          <div class="card-row card-row--featured">
            <div v-for="show in inProgress" :key="show.id" class="card card--featured" @click="modalShow = show">
              <div class="card-img-wrap">
                <img v-if="show.meta?.poster" :src="show.meta.poster" :alt="show.title" class="card-img" loading="lazy" @error="($event.target as HTMLImageElement).style.display='none'" />
                <div v-else class="card-img-placeholder">{{ show.title.charAt(0) }}</div>
                <div class="card-overlay"><div class="card-overlay-content">
                  <span class="card-medium-badge">{{ show.medium }}</span>
                  <h3 class="card-title">{{ show.title }}</h3>
                  <span class="card-genre">{{ show.meta?.genre || show.keyword }}</span>
                </div></div>
                <div class="card-status-badge card-status-badge--ip">▶ Watching</div>
                <div v-if="show.meta?.imdbRating" class="card-rating">★ {{ show.meta.imdbRating }}</div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="unwatched.length" class="row-section">
          <h2 class="row-title"><span class="row-dot row-dot--o"></span>Up Next <span class="row-count">{{ unwatched.length }}</span></h2>
          <div class="card-row">
            <div v-for="show in unwatched" :key="show.id" class="card card--upnext" @click="modalShow = show">
              <div class="card-img-wrap">
                <img v-if="show.meta?.poster" :src="show.meta.poster" :alt="show.title" class="card-img" loading="lazy" @error="($event.target as HTMLImageElement).style.display='none'" />
                <div v-else class="card-img-placeholder">{{ show.title.charAt(0) }}</div>
                <div class="card-overlay"><div class="card-overlay-content">
                  <span class="card-medium-badge">{{ show.medium }}</span>
                  <h3 class="card-title">{{ show.title }}</h3>
                  <span class="card-genre">{{ show.meta?.genre || show.keyword }}</span>
                </div></div>
                <div v-if="show.meta?.imdbRating" class="card-rating">★ {{ show.meta.imdbRating }}</div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="watched.length" class="row-section">
          <h2 class="row-title"><span class="row-dot row-dot--x"></span>Watched <span class="row-count">{{ watched.length }}</span></h2>
          <div class="card-row card-row--dim">
            <div v-for="show in watched" :key="show.id" class="card card--watched" @click="modalShow = show">
              <div class="card-img-wrap">
                <img v-if="show.meta?.poster" :src="show.meta.poster" :alt="show.title" class="card-img" loading="lazy" @error="($event.target as HTMLImageElement).style.display='none'" />
                <div v-else class="card-img-placeholder">{{ show.title.charAt(0) }}</div>
                <div class="card-overlay"><div class="card-overlay-content">
                  <span class="card-medium-badge">{{ show.medium }}</span>
                  <h3 class="card-title">{{ show.title }}</h3>
                  <span class="card-genre">{{ show.meta?.genre || show.keyword }}</span>
                </div></div>
                <div class="card-status-badge card-status-badge--x">✓</div>
                <div v-if="show.meta?.imdbRating" class="card-rating">★ {{ show.meta.imdbRating }}</div>
              </div>
            </div>
          </div>
        </section>

        <div v-if="!inProgress.length && !unwatched.length && !watched.length" class="empty-state">Nothing matches your filters.</div>
      </div>
    </main>

    <!-- DETAIL MODAL -->
    <Teleport to="body">
      <div v-if="modalShow" class="modal-backdrop" @click.self="modalShow = null">
        <div class="modal modal--detail">
          <button class="modal-close" @click="modalShow = null">✕</button>
          <div class="detail-layout">
            <div class="detail-poster-col">
              <img v-if="modalShow.meta?.poster" :src="modalShow.meta.poster" :alt="modalShow.title" class="detail-poster" @error="($event.target as HTMLImageElement).style.display='none'" />
              <div v-else class="detail-poster-placeholder">{{ modalShow.title.charAt(0) }}</div>
            </div>
            <div class="detail-info-col">
              <div class="modal-badges">
                <span class="modal-badge modal-badge--medium">{{ modalShow.medium }}</span>
                <span v-if="modalShow.meta?.genre" class="modal-badge modal-badge--genre">{{ modalShow.meta.genre.split(',')[0] }}</span>
                <span v-if="modalShow.meta?.rated" class="modal-badge modal-badge--rated">{{ modalShow.meta.rated }}</span>
              </div>

              <h2 class="modal-title">{{ modalShow.title }}</h2>

              <template v-if="modalShow.meta">
                <div v-if="modalShow.meta.imdbRating" class="omdb-rating">
                  <span class="rating-star">★</span>
                  <span class="rating-val" :style="{ color: ratingColor(modalShow.meta.imdbRating) }">{{ modalShow.meta.imdbRating }}</span>
                  <span class="rating-out">/10</span>
                  <span v-if="modalShow.meta.imdbVotes" class="rating-votes">{{ modalShow.meta.imdbVotes }} votes</span>
                </div>
                <div class="omdb-meta-row">
                  <span v-if="modalShow.meta.year"    class="omdb-chip">{{ modalShow.meta.year }}</span>
                  <span v-if="modalShow.meta.runtime" class="omdb-chip">{{ modalShow.meta.runtime }}</span>
                  <span v-if="modalShow.meta.seasons" class="omdb-chip">{{ modalShow.meta.seasons }} seasons</span>
                  <span v-if="modalShow.meta.country" class="omdb-chip">{{ modalShow.meta.country.split(',')[0] }}</span>
                </div>
                <p v-if="modalShow.meta.plot" class="omdb-plot">{{ modalShow.meta.plot }}</p>
                <div class="omdb-details">
                  <div v-if="modalShow.meta.genre"    class="omdb-row"><span class="omdb-lbl">Genre</span><span>{{ modalShow.meta.genre }}</span></div>
                  <div v-if="modalShow.meta.director" class="omdb-row"><span class="omdb-lbl">Director</span><span>{{ modalShow.meta.director }}</span></div>
                  <div v-if="modalShow.meta.actors"   class="omdb-row"><span class="omdb-lbl">Cast</span><span>{{ modalShow.meta.actors }}</span></div>
                  <div v-if="modalShow.meta.awards"   class="omdb-row"><span class="omdb-lbl">Awards</span><span>{{ modalShow.meta.awards }}</span></div>
                </div>
              </template>
              <div v-else class="no-meta">No metadata yet — will be fetched automatically.</div>

              <div class="modal-status-section">
                <span class="modal-status-label">Your Status</span>
                <div class="modal-status-btns">
                  <button v-for="s in statusMap" :key="s.key" class="status-btn"
                    :class="{ 'status-btn--active': modalShow.status === s.key }"
                    :style="modalShow.status === s.key ? { borderColor: s.color, color: s.color, background: s.color + '1a' } : {}"
                    @click="updateStatus(modalShow!, s.key)"
                  >{{ s.icon }} {{ s.label }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ADD MODAL -->
    <Teleport to="body">
      <div v-if="addModalOpen" class="modal-backdrop" @click.self="addModalOpen = false">
        <div class="modal modal--add">
          <button class="modal-close" @click="addModalOpen = false">✕</button>
          <h2 class="modal-title">Add to List</h2>
          <p class="add-hint">Poster, plot, rating &amp; more will be fetched automatically via OMDB.</p>
          <div class="form-field">
            <label>Title</label>
            <input v-model="newShow.title" class="form-input" placeholder="Exact title (e.g. Breaking Bad)" />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Genre <span class="form-hint">(auto-filled)</span></label>
              <input v-model="newShow.keyword" class="form-input" placeholder="e.g. Action" />
            </div>
            <div class="form-field">
              <label>Type</label>
              <select v-model="newShow.medium" class="form-input">
                <option>TV</option><option>Movie</option><option>Anime</option>
              </select>
            </div>
          </div>
          <div class="form-field">
            <label>Status</label>
            <div class="modal-status-btns">
              <button v-for="s in statusMap" :key="s.key" class="status-btn"
                :class="{ 'status-btn--active': newShow.status === s.key }"
                :style="newShow.status === s.key ? { borderColor: s.color, color: s.color, background: s.color + '1a' } : {}"
                @click="newShow.status = s.key"
              >{{ s.icon }} {{ s.label }}</button>
            </div>
          </div>
          <div class="form-actions">
            <span class="save-msg" :class="{ 'save-msg--err': saveMsg.startsWith('✗') }">{{ saveMsg }}</span>
            <button class="add-btn add-btn--full" :disabled="saving" @click="addShow">{{ saving ? 'Saving…' : '+ Add to List' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style>
html, body { overflow-x: hidden; max-width: 100vw; margin: 0; padding: 0; background: #0a0a0f; scrollbar-gutter: stable; }
</style>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600&display=swap');

:root {
  --bg: #0a0a0f; --surface: #111118; --surface2: #1c1c27; --border: #2e2e3e;
  --text: #e4e4f0; --dim: #6a6a85; --accent: #e63946; --watching: #f59e0b; --watched: #10b981;
  --font-display: 'Bebas Neue', sans-serif; --font-body: 'Outfit', sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.wl {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
  --grid-cols: 7;
  --grid-cols-featured: 6;
}

.wl-inner { max-width: 2200px; margin: 0 auto; padding: 0 4rem; }

/* HEADER */
.wl-header { background: rgba(10,10,15,0.97); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); padding: 1.4rem 0 0; position: sticky; top: 0; z-index: 50; }
.wl-header-row { display: flex; align-items: center; gap: 3rem; margin-bottom: 1.1rem; }
.logo { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
.logo-icon { font-size: 1.5rem; color: var(--accent); }
.logo-text { font-family: var(--font-display); font-size: 1.8rem; letter-spacing: 0.05em; }
.header-stats { display: flex; gap: 3rem; flex: 1; }
.hstat { display: flex; flex-direction: column; align-items: center; }
.hstat-n { font-family: var(--font-display); font-size: 1.7rem; line-height: 1; }
.hstat-l { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--dim); margin-top: 2px; }
.hstat--watching .hstat-n { color: var(--watching); }
.hstat--watched  .hstat-n { color: var(--watched); }
.header-right { display: flex; align-items: center; gap: 1.1rem; flex-shrink: 0; }
.enrich-hint { font-size: 0.72rem; color: var(--dim); font-style: italic; display: flex; align-items: center; gap: 0.4rem; }
.api-counter  { font-size: 0.7rem; color: var(--dim); font-variant-numeric: tabular-nums; }

.refresh-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--dim); border-radius: 8px; padding: 0.45rem 0.7rem; font-size: 1rem; cursor: pointer; transition: color 0.2s, border-color 0.2s; line-height: 1; }
.refresh-btn:hover { color: var(--text); border-color: var(--text); }
.add-btn { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 0.6rem 1.5rem; font-family: var(--font-body); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.1s; white-space: nowrap; }
.add-btn:hover   { opacity: 0.85; }
.add-btn:active  { transform: scale(0.97); }
.add-btn--full   { width: 100%; padding: 0.8rem; font-size: 0.95rem; }
.add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.wl-filters { display: flex; align-items: center; gap: 0.9rem; padding-bottom: 1rem; flex-wrap: wrap; }
.search-wrap { position: relative; }
.search-icon { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); color: var(--dim); font-size: 1.1rem; pointer-events: none; }
.search-input { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.52rem 0.9rem 0.52rem 2.2rem; color: var(--text); font-family: var(--font-body); font-size: 0.87rem; width: 230px; outline: none; transition: border-color 0.2s; }
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--dim); }
.filter-chips { display: flex; gap: 0.45rem; flex-wrap: wrap; }
.chip { background: var(--surface2); border: 1px solid var(--border); color: var(--dim); border-radius: 99px; padding: 0.38rem 1.1rem; font-size: 0.8rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
.chip:hover { border-color: var(--text); color: var(--text); }
.chip--active.chip--all { background: rgba(255,255,255,0.09); border-color: var(--text);     color: var(--text); }
.chip--active.chip--ip  { background: rgba(245,158,11,0.14);  border-color: var(--watching); color: var(--watching); }
.chip--active.chip--o   { background: rgba(156,163,175,0.12); border-color: #9ca3af;         color: #d1d5db; }
.chip--active.chip--x   { background: rgba(16,185,129,0.14);  border-color: var(--watched);  color: var(--watched); }
.wl-select { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 0.44rem 0.85rem; font-size: 0.84rem; font-family: var(--font-body); cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; }
.wl-select:focus { border-color: var(--accent); }
.wl-select option { background: #1c1c27; color: #e4e4f0; }

/* LOADING */
.wl-loading, .wl-error { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; min-height: 40vh; color: var(--dim); }
.spinner { width: 38px; height: 38px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner--xs { width: 14px; height: 14px; border-width: 2px; display: inline-block; animation: spin 0.8s linear infinite; border-color: var(--border); border-top-color: var(--dim); border-radius: 50%; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.retry-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 0.45rem 1.1rem; border-radius: 8px; cursor: pointer; font-family: var(--font-body); }

/* MAIN */
.wl-main { padding: 3rem 0 7rem; }
.row-section { margin-bottom: 4rem; }
.row-title { font-family: var(--font-display); font-size: 1.7rem; letter-spacing: 0.05em; color: var(--text); margin-bottom: 1.4rem; display: flex; align-items: center; gap: 0.6rem; }
.row-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.row-dot--ip { background: var(--watching); animation: glow 2s ease-in-out infinite; }
.row-dot--o  { background: #9ca3af; }
.row-dot--x  { background: var(--watched); }
@keyframes glow { 0%,100% { box-shadow: 0 0 4px var(--watching); } 50% { box-shadow: 0 0 16px var(--watching); } }
.row-count { font-family: var(--font-body); font-size: 0.88rem; font-weight: 400; color: var(--dim); }

/* CARD GRID */
.card-row {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols, 7), 1fr);
  gap: 1.4rem;
}
.card-row--featured {
  grid-template-columns: repeat(var(--grid-cols-featured, 6), 1fr);
}
.card-row--dim .card       { opacity: 0.58; }
.card-row--dim .card:hover { opacity: 1; }

/* CARD */
.card { cursor: pointer; border-radius: 10px; overflow: hidden; position: relative; background: var(--surface2); border: 1px solid var(--border); transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s; }
.card:hover { transform: scale(1.04) translateY(-5px); box-shadow: 0 22px 52px rgba(0,0,0,0.75); z-index: 2; }
.card--featured { border-color: rgba(245,158,11,0.42); box-shadow: 0 4px 26px rgba(245,158,11,0.15); }
.card--featured:hover { border-color: rgba(245,158,11,0.68); box-shadow: 0 22px 52px rgba(245,158,11,0.24); }
.card--upnext { border-color: rgba(156,163,175,0.38); box-shadow: 0 3px 16px rgba(0,0,0,0.58); }
.card--upnext:hover { border-color: rgba(156,163,175,0.62); box-shadow: 0 22px 52px rgba(0,0,0,0.7); }
.card--watched { border-color: rgba(16,185,129,0.18); }

.card-img-wrap { position: relative; aspect-ratio: 2/3; overflow: hidden; }
.card-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
.card:hover .card-img { transform: scale(1.07); }
.card-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 4rem; color: var(--dim); background: var(--surface2); }
.card-overlay { position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0) 52%); opacity: 0; transition: opacity 0.2s; display: flex; align-items: flex-end; }
.card:hover .card-overlay { opacity: 1; }
.card-overlay-content { padding: 0.8rem; width: 100%; }
.card-medium-badge { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.45); display: block; margin-bottom: 0.25rem; }
.card-title { font-family: var(--font-display); font-size: 1.05rem; color: #fff; line-height: 1.2; margin-bottom: 0.2rem; }
.card-genre { font-size: 0.65rem; color: rgba(255,255,255,0.4); }
.card-status-badge { position: absolute; top: 0.5rem; right: 0.5rem; border-radius: 5px; padding: 0.18rem 0.5rem; font-size: 0.65rem; font-weight: 600; letter-spacing: 0.05em; }
.card-status-badge--ip { background: rgba(245,158,11,0.92); color: #000; }
.card-status-badge--x  { background: rgba(16,185,129,0.9);  color: #000; }
.card-rating { position: absolute; bottom: 0.5rem; right: 0.5rem; font-size: 0.68rem; font-weight: 600; color: #f59e0b; background: rgba(0,0,0,0.7); border-radius: 4px; padding: 0.12rem 0.4rem; }

.empty-state { text-align: center; padding: 5rem; color: var(--dim); font-size: 1rem; }

/* MODAL SHARED */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.86); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: max(1.5rem, env(safe-area-inset-top)) 1.5rem 1.5rem; }
.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-height: 93vh; overflow-y: auto; position: relative; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
.modal-close { position: absolute; top: max(0.9rem, env(safe-area-inset-top, 0.9rem)); right: max(0.9rem, env(safe-area-inset-right, 0.9rem)); background: rgba(0,0,0,0.55); border: 1px solid var(--border); color: var(--text); width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; z-index: 10; transition: background 0.2s; }
.modal-close:hover { background: rgba(255,255,255,0.12); }

/* DETAIL MODAL */
.modal--detail { max-width: 900px; }
.detail-layout { display: grid; grid-template-columns: 280px 1fr; }
.detail-poster-col { flex-shrink: 0; border-radius: 16px 0 0 16px; overflow: hidden; }
.detail-poster { width: 100%; height: 100%; object-fit: cover; display: block; min-height: 420px; }
.detail-poster-placeholder { width: 100%; min-height: 420px; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-size: 6rem; color: var(--dim); background: var(--surface2); }
.detail-info-col { padding: 2.25rem 2.25rem 2.25rem 2rem; display: flex; flex-direction: column; gap: 1.2rem; overflow-y: auto; }

.modal-badges { display: flex; gap: 0.45rem; flex-wrap: wrap; }
.modal-badge { font-size: 0.65rem; padding: 0.22rem 0.6rem; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
.modal-badge--medium { background: rgba(230,57,70,0.15); color: var(--accent); border: 1px solid rgba(230,57,70,0.3); }
.modal-badge--genre  { background: var(--surface2); color: var(--dim); border: 1px solid var(--border); }
.modal-badge--rated  { background: rgba(245,158,11,0.12); color: var(--watching); border: 1px solid rgba(245,158,11,0.25); }
.modal-title { font-family: var(--font-display); font-size: 2.2rem; letter-spacing: 0.03em; color: var(--text); line-height: 1.1; }

.omdb-rating { display: flex; align-items: baseline; gap: 0.38rem; }
.rating-star { font-size: 1.15rem; color: var(--watching); }
.rating-val  { font-family: var(--font-display); font-size: 2.1rem; line-height: 1; }
.rating-out  { font-size: 0.82rem; color: var(--dim); }
.rating-votes { font-size: 0.73rem; color: var(--dim); margin-left: 0.3rem; }
.omdb-meta-row { display: flex; gap: 0.45rem; flex-wrap: wrap; }
.omdb-chip { font-size: 0.73rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 0.22rem 0.6rem; color: var(--dim); }
.omdb-plot { font-size: 0.9rem; line-height: 1.68; color: var(--text); opacity: 0.85; border-left: 2px solid var(--border); padding-left: 0.9rem; }
.omdb-details { display: flex; flex-direction: column; gap: 0.5rem; }
.omdb-row { display: flex; gap: 0.65rem; font-size: 0.82rem; line-height: 1.5; }
.omdb-lbl { color: var(--dim); min-width: 72px; flex-shrink: 0; font-weight: 500; }
.no-meta { font-size: 0.82rem; color: var(--dim); font-style: italic; }

.modal-status-section { margin-top: auto; padding-top: 1.1rem; border-top: 1px solid var(--border); }
.modal-status-label { font-size: 0.73rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--dim); display: block; margin-bottom: 0.65rem; }
.modal-status-btns { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.status-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--dim); border-radius: 8px; padding: 0.52rem 1.1rem; font-size: 0.84rem; font-family: var(--font-body); cursor: pointer; transition: all 0.15s; }
.status-btn:hover  { color: var(--text); border-color: var(--text); }
.status-btn--active { font-weight: 600; }

/* ADD MODAL */
.modal--add { max-width: 500px; padding: 2.25rem; display: flex; flex-direction: column; gap: 1.2rem; }
.add-hint { font-size: 0.82rem; color: var(--dim); margin-top: -0.5rem; }
.form-field { display: flex; flex-direction: column; gap: 0.42rem; }
.form-field label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--dim); }
.form-hint { font-size: 0.65rem; color: var(--dim); opacity: 0.7; text-transform: none; letter-spacing: 0; }
.form-input { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 0.58rem 0.85rem; font-family: var(--font-body); font-size: 0.9rem; outline: none; transition: border-color 0.2s; width: 100%; appearance: none; -webkit-appearance: none; }
.form-input:focus { border-color: var(--accent); }
.form-input::placeholder { color: var(--dim); }
select.form-input option { background: #1c1c27; color: #e4e4f0; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
.form-actions { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.5rem; }
.save-msg { font-size: 0.82rem; color: var(--watched); text-align: center; min-height: 1.2em; }
.save-msg--err { color: var(--accent); }

/* BUTTON */
.btn {
  width: 130px;
  height: 40px;
  color: #fff;
  border-radius: 5px;
  padding: 10px 25px;
  font-family: 'Lato', sans-serif;
  font-weight: 500;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: inline-block;
   box-shadow:inset 2px 2px 2px 0px rgba(255,255,255,.5),
   7px 7px 20px 0px rgba(0,0,0,.1),
   4px 4px 5px 0px rgba(0,0,0,.1);
  outline: none;
  margin-bottom: 20px;
}

/* RANDOM */
.random {
  width: 130px;
  height: 40px;
  line-height: 42px;
  padding: 0;
  border: none;
  background: rgb(255,27,0);
background: linear-gradient(0deg, rgba(255,27,0,1) 0%, rgba(251,75,2,1) 100%);
}
.random:hover {
  color: #f0094a;
  background: transparent;
   box-shadow:none;
}
.random:before,
.random:after{
  content:'';
  position:absolute;
  top:0;
  right:0;
  height:2px;
  width:0;
  background: #f0094a;
  box-shadow:
   -1px -1px 5px 0px #fff,
   7px 7px 20px 0px #0003,
   4px 4px 5px 0px #0002;
  transition:400ms ease all;
}
.random:after{
  right:inherit;
  top:inherit;
  left:0;
  bottom:0;
}
.random:hover:before,
.random:hover:after{
  width:100%;
  transition:800ms ease all;
}

/* RESPONSIVE */
@media (max-width: 1800px) { .wl { --grid-cols: 6; --grid-cols-featured: 5; } }
@media (max-width: 1400px) { .wl { --grid-cols: 5; --grid-cols-featured: 4; } }
@media (max-width: 1200px) {
  .wl { --grid-cols: 4; --grid-cols-featured: 4; }
  .wl-inner { padding: 0 2.5rem; }
  .detail-layout { grid-template-columns: 240px 1fr; }
}
@media (max-width: 860px) {
  .wl { --grid-cols: 3; --grid-cols-featured: 3; }
  .wl-inner { padding: 0 1.5rem; }
  .detail-layout { grid-template-columns: 1fr; }
  .detail-poster-col { aspect-ratio: 16/9; border-radius: 16px 16px 0 0; max-height: 280px; }
  .detail-poster { object-position: center 20%; min-height: unset; }
  .detail-poster-placeholder { min-height: 220px; }
}
@media (max-width: 600px) {
  .wl { --grid-cols: 2; --grid-cols-featured: 2; }
  .wl-inner { padding: 0 1rem; }
  .wl-header-row { flex-wrap: wrap; gap: 0.75rem; }
  .header-stats  { order: 3; width: 100%; justify-content: space-around; padding-bottom: 0.6rem; gap: 0; }
  .header-right  { margin-left: auto; }
  .search-input  { width: 100%; }
  .search-wrap   { width: 100%; }
  .card-row      { gap: 0.8rem; }
  .row-title     { font-size: 1.35rem; }
  .modal-backdrop { padding: 0; align-items: flex-end; }
  .modal { border-radius: 16px 16px 0 0; max-height: 95vh; }
  .modal--add { padding: 1.5rem; }
  .detail-info-col { padding: 1.4rem; }
}
</style>