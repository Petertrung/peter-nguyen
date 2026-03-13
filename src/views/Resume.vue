<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// --- TYPES ---
interface Job {
  id: number;
  title: string;
  company: string;
  start: string;
  end: string | null;
  tags: string[];
  description: string;
  type: 'dev' | 'education';
}

// --- DATA ---
const jobs: Job[] = [
  {
    id: 1,
    title: 'Application Developer',
    company: 'City of Seattle',
    start: '2023-07',
    end: null,
    tags: ['React', 'AWS', 'SQL', 'Node.js', 'Oracle'],
    description:
      'Support and maintain the City of Seattle\'s financial budgeting applications, ensuring reliability and smooth operations for core budgeting workflows. Build new internal tools, including an apartment rental data application.',
    type: 'dev',
  },
  {
    id: 2,
    title: 'CS Tutor',
    company: 'North Seattle College',
    start: '2022-01',
    end: '2023-06',
    tags: ['JavaScript', 'SQL', 'HTML', 'CSS'],
    description:
      'Tutoring students one on one at North Seattle College, supporting web programming, JavaScript, and SQL courses (IT 102, 161, 125, 111, 112, 115).',
    type: 'education',
  },
  {
    id: 3,
    title: 'Coding Mentor',
    company: 'Mighty Coders',
    start: '2021-07',
    end: '2021-11',
    tags: ['JavaScript', 'Python', 'Scratch'],
    description:
      'Mentored kids aged 7–14 in coding using Scratch, JavaScript, and Python through game-building projects. Ran intensive week-long summer coding camps.',
    type: 'education',
  },
  {
    id: 4,
    title: 'Front-End Developer',
    company: 'Shield Compliance',
    start: '2019-05',
    end: '2020-08',
    tags: ['AngularJS', 'Bootstrap', 'ASP.Net', 'CSS', 'TDD'],
    description:
      'Collaborated on planning, wireframing, and prototyping new features for a fintech app used by financial institutions. Built tables for transaction data, SAR submission flows, and data visualizations.',
    type: 'dev',
  },
  {
    id: 5,
    title: 'Front-End Web Developer',
    company: 'Columbia Bank',
    start: '2017-10',
    end: '2019-02',
    tags: ['PHP', 'Bootstrap', 'Git', 'HTML', 'CSS'],
    description:
      'Maintained the company intranet for 150+ branches and 2,500+ employees. Built seasonal redesigns, created custom PHP add-ons for email and WYSIWYG editing.',
    type: 'dev',
  },
];

const skills = [
  { name: 'JavaScript', level: 95, category: 'language' },
  { name: 'TypeScript', level: 82, category: 'language' },
  { name: 'SQL', level: 85, category: 'language' },
  { name: 'Python', level: 65, category: 'language' },
  { name: 'PHP', level: 60, category: 'language' },
  { name: 'React', level: 90, category: 'framework' },
  { name: 'Vue', level: 85, category: 'framework' },
  { name: 'AngularJS', level: 70, category: 'framework' },
  { name: 'Node.js', level: 80, category: 'framework' },
  { name: 'Bootstrap', level: 88, category: 'framework' },
  { name: 'AWS', level: 72, category: 'tool' },
  { name: 'Git', level: 90, category: 'tool' },
  { name: 'Oracle', level: 68, category: 'tool' },
  { name: 'CSS', level: 92, category: 'language' },
  { name: 'HTML', level: 95, category: 'language' },
];

// --- COMPUTED STATS ---
const totalMonths = computed(() => {
  const careerStart = new Date('2017-10');
  const now = new Date();
  return Math.floor((now.getTime() - careerStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
});

const yearsExp = computed(() => (totalMonths.value / 12).toFixed(1));

const totalCompanies = computed(() => jobs.length);

const techCount = computed(() => {
  const all = new Set(jobs.flatMap(j => j.tags));
  return all.size;
});

// --- TIMELINE BAR CHART ---
const timelineStart = new Date('2017-01');
const timelineEnd = new Date();
const totalTimelineMs = timelineEnd.getTime() - timelineStart.getTime();

function barLeft(start: string) {
  const ms = new Date(start).getTime() - timelineStart.getTime();
  return ((ms / totalTimelineMs) * 100).toFixed(2);
}
function barWidth(start: string, end: string | null) {
  const endDate = end ? new Date(end) : new Date();
  const ms = endDate.getTime() - new Date(start).getTime();
  return ((ms / totalTimelineMs) * 100).toFixed(2);
}

function formatDate(d: string | null): string {
  if (!d) return 'Present';
  const parts = d.split('-');
  const y = parts[0] ?? '';
  const m = parts[1] ?? '01';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1] ?? ''} ${y}`;
}

// --- SKILL FILTER ---
const activeCategory = ref<string | null>(null);
const filteredSkills = computed(() => {
  if (!activeCategory.value) return skills;
  return skills.filter(s => s.category === activeCategory.value);
});

// --- ANIMATED COUNTERS ---
const displayYears = ref(0);
const displayCompanies = ref(0);
const displayTech = ref(0);

onMounted(() => {
  const duration = 1400;
  const steps = 60;
  const interval = duration / steps;

  let step = 0;
  const timer = setInterval(() => {
    step++;
    const progress = step / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    displayYears.value = parseFloat((parseFloat(yearsExp.value) * eased).toFixed(1));
    displayCompanies.value = Math.round(totalCompanies.value * eased);
    displayTech.value = Math.round(techCount.value * eased);
    if (step >= steps) clearInterval(timer);
  }, interval);
});

// --- ACTIVE JOB ---
const activeJob = ref<Job>(jobs[0]!);
</script>

<template>
  <div class="resume-dashboard">

    <!-- HEADER -->
    <header class="dash-header">
      <div class="header-left">
        <h1 class="name-heading">Work <span class="accent">History</span></h1>
        <p class="subtitle">Roles, skills &amp; experience.</p>
      </div>
      <div class="header-right">
        <div class="live-dot-wrap"><span class="live-dot"></span><span class="live-label">Actively employed</span></div>
      </div>
    </header>

    <!-- STAT CARDS -->
    <section class="stats-row">
      <div class="stat-card">
        <span class="stat-number">{{ displayYears }}<span class="stat-unit">yrs</span></span>
        <span class="stat-label">Experience</span>
        <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: '100%' }"></div></div>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ displayCompanies }}</span>
        <span class="stat-label">Companies</span>
        <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: (displayCompanies / totalCompanies * 100) + '%' }"></div></div>
      </div>
      <div class="stat-card">
        <span class="stat-number">{{ displayTech }}<span class="stat-unit">+</span></span>
        <span class="stat-label">Technologies</span>
        <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: (displayTech / techCount * 100) + '%' }"></div></div>
      </div>
      <div class="stat-card stat-card--highlight">
        <span class="stat-number">2017</span>
        <span class="stat-label">Career Start</span>
        <div class="stat-subtext">Columbia Bank, Oct</div>
      </div>
    </section>

    <!-- GANTT TIMELINE -->
    <section class="section gantt-section">
      <div class="gantt-years">
        <span v-for="y in [2017,2018,2019,2020,2021,2022,2023,2024,2025]" :key="y" class="gantt-year">{{ y }}</span>
      </div>
      <div class="gantt-rows">
        <div
          v-for="job in jobs"
          :key="job.id"
          class="gantt-row"
          :class="{ active: activeJob.id === job.id }"
          @click="activeJob = job"
        >
          <div class="gantt-label">
            <span class="gantt-company">{{ job.company }}</span>
          </div>
          <div class="gantt-track">
            <div
              class="gantt-bar"
              :class="[`gantt-bar--${job.type}`, { 'gantt-bar--current': !job.end }]"
              :style="{ left: barLeft(job.start) + '%', width: barWidth(job.start, job.end) + '%' }"
            >
              <span class="gantt-bar-label">{{ job.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- JOB DETAIL + CLASSIC TIMELINE -->
    <section class="bottom-grid">

      <!-- LEFT: JOB DETAIL PANEL -->
      <div class="job-detail-panel">
        <transition name="fade" mode="out-in">
          <div class="job-detail" :key="activeJob.id">
            <div class="job-detail-header">
              <div>
                <h2 class="job-title">{{ activeJob.title }}</h2>
                <div class="job-company">@ {{ activeJob.company }}</div>
              </div>
              <div class="job-dates">
                <span>{{ formatDate(activeJob.start) }}</span>
                <span class="date-divider">→</span>
                <span :class="{ 'current-badge': !activeJob.end }">{{ formatDate(activeJob.end) }}</span>
              </div>
            </div>
            <p class="job-description">{{ activeJob.description }}</p>
            <div class="job-tags">
              <span v-for="tag in activeJob.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
        </transition>
      </div>

      <!-- RIGHT: VERTICAL TIMELINE -->
      <div class="v-timeline">
        <div class="vtl-wrap">
          <div class="vtl-line"></div>
          <div
            v-for="(job, i) in jobs"
            :key="job.id"
            class="vtl-item"
            :class="{ 'vtl-item--active': activeJob.id === job.id }"
            @click="activeJob = job"
          >
            <div class="vtl-dot" :class="`vtl-dot--${job.type}`">
              <span class="vtl-index">{{ jobs.length - i }}</span>
            </div>
            <div class="vtl-content">
              <div class="vtl-title">{{ job.title }}</div>
              <div class="vtl-meta">{{ job.company }} · {{ formatDate(job.start) }}–{{ formatDate(job.end) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SKILLS -->
    <section class="section skills-section">
      <div class="skill-filters">
        <button
          v-for="cat in [null, 'language', 'framework', 'tool']"
          :key="String(cat)"
          class="filter-btn"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = cat"
        >{{ cat ?? 'All' }}</button>
      </div>
      <div class="skills-grid">
        <div v-for="skill in filteredSkills" :key="skill.name" class="skill-row">
          <div class="skill-meta">
            <span class="skill-name">{{ skill.name }}</span>
            <span class="skill-pct">{{ skill.level }}%</span>
          </div>
          <div class="skill-track">
            <div class="skill-fill" :style="{ width: skill.level + '%' }" :class="`skill-fill--${skill.category}`"></div>
            <div class="skill-ticks">
              <span v-for="t in [25,50,75]" :key="t" class="tick" :style="{ left: t + '%' }"></span>
            </div>
          </div>
        </div>
      </div>
    </section>


  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;700&display=swap');

/* ── ROOT VARS ── */
:root {
  --bg:         #0d0f14;
  --surface:    #13161e;
  --surface2:   #1a1e29;
  --border:     #252a38;
  --text:       #c8cdd8;
  --text-dim:   #5a6070;
  --accent:     #4fffb0;
  --accent2:    #5b8cff;
  --accent3:    #ff6b6b;
  --mono:       'Space Mono', monospace;
  --sans:       'DM Sans', sans-serif;
}

/* ── RESET ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.resume-dashboard {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 2.5rem 2rem 4rem;
  max-width: 1500px;
  width: 100%;
  margin: 0 auto;
  overflow-x: hidden;
}

/* ── HEADER ── */
.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.name-heading {
  font-family: var(--sans);
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: #e8eaf0;
}

.accent { color: var(--accent); }

.subtitle {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-dim);
  font-weight: 300;
}

.live-dot-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 0.4rem 0.9rem;
  border-radius: 99px;
  margin-top: 0.5rem;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 2s infinite;
}

.live-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--accent);
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(79, 255, 176, 0.5); }
  50% { box-shadow: 0 0 0 5px rgba(79, 255, 176, 0); }
}

/* ── STAT CARDS ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  transition: border-color 0.2s;
}

.stat-card:hover { border-color: var(--accent); }
.stat-card--highlight { border-color: rgba(79, 255, 176, 0.3); }

.stat-number {
  font-family: var(--mono);
  font-size: 2.4rem;
  font-weight: 700;
  color: #e8eaf0;
  line-height: 1;
}

.stat-unit {
  font-size: 1rem;
  color: var(--accent);
  margin-left: 2px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-subtext {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-dim);
  margin-top: 0.2rem;
}

.stat-bar {
  height: 2px;
  background: var(--border);
  border-radius: 99px;
  margin-top: 0.8rem;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 99px;
  transition: width 1.4s cubic-bezier(0.16,1,0.3,1);
}

/* ── GANTT ── */
.gantt-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.5rem;
  overflow: hidden;
  min-width: 0;
}

.gantt-years {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-left: 130px;
  min-width: 0;
}

.gantt-year {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-dim);
}

.gantt-rows { display: flex; flex-direction: column; gap: 0.6rem; }

.gantt-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
  min-width: 0;
}

.gantt-row:hover, .gantt-row.active { background: rgba(255,255,255,0.03); }
.gantt-row.active .gantt-company { color: var(--accent); }

.gantt-label { width: 120px; flex-shrink: 0; }

.gantt-company {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.gantt-track {
  flex: 1;
  height: 28px;
  position: relative;
  background: var(--surface2);
  border-radius: 4px;
  overflow: hidden;
  min-width: 0;
}

.gantt-bar {
  position: absolute;
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 0.5rem;
  transition: opacity 0.2s;
  min-width: 20px;
}

.gantt-bar--dev      { background: rgba(91, 140, 255, 0.25); border: 1px solid rgba(91, 140, 255, 0.4); }
.gantt-bar--education{ background: rgba(79, 255, 176, 0.15); border: 1px solid rgba(79, 255, 176, 0.3); }
.gantt-bar--current  { background: rgba(91, 140, 255, 0.35); border: 1px solid rgba(91, 140, 255, 0.6); animation: shimmer 3s ease-in-out infinite; }

@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
}

.gantt-bar-label {
  font-size: 0.65rem;
  font-family: var(--mono);
  color: rgba(255,255,255,0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── BOTTOM GRID ── */
.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

/* ── JOB DETAIL ── */
.job-detail-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.5rem;
}

.job-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.job-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #e8eaf0;
  line-height: 1.2;
}

.job-company {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--accent2);
  margin-top: 0.2rem;
}

.job-dates {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-dim);
  flex-shrink: 0;
  text-align: right;
  flex-direction: column;
}

.date-divider { color: var(--border); }

.current-badge {
  color: var(--accent);
  background: rgba(79,255,176,0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
  border: 1px solid rgba(79,255,176,0.2);
}

.job-description {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--text);
  margin-bottom: 1.2rem;
}

.job-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag {
  font-family: var(--mono);
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  background: rgba(91,140,255,0.1);
  border: 1px solid rgba(91,140,255,0.2);
  color: var(--accent2);
}

/* ── VERTICAL TIMELINE ── */
.v-timeline {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.5rem;
}

.vtl-wrap {
  position: relative;
  padding-left: 1.5rem;
}

.vtl-line {
  position: absolute;
  left: 12px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
}

.vtl-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  cursor: pointer;
  position: relative;
  transition: opacity 0.2s;
}

.vtl-item:last-child { margin-bottom: 0; }
.vtl-item:not(.vtl-item--active) { opacity: 0.5; }
.vtl-item:hover { opacity: 0.85; }
.vtl-item--active { opacity: 1; }

.vtl-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  margin-left: -1.5rem;
}

.vtl-dot--dev       { background: rgba(91,140,255,0.2); border: 1.5px solid var(--accent2); }
.vtl-dot--education { background: rgba(79,255,176,0.1); border: 1.5px solid var(--accent); }

.vtl-index {
  font-family: var(--mono);
  font-size: 0.6rem;
  color: var(--text-dim);
}

.vtl-content { flex: 1; }

.vtl-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #e8eaf0;
}

.vtl-meta {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--text-dim);
  margin-top: 0.2rem;
  line-height: 1.5;
}

/* ── SKILLS BAR ── */
.skills-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1.5rem;
}

.skill-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.filter-btn {
  font-family: var(--mono);
  font-size: 0.7rem;
  padding: 0.3rem 0.75rem;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.2s;
}

.filter-btn:hover { border-color: var(--accent); color: var(--accent); }
.filter-btn.active { background: rgba(79,255,176,0.1); border-color: var(--accent); color: var(--accent); }

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: 1rem;
}

.skill-row {}

.skill-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.skill-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text);
}

.skill-pct {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--text-dim);
}

.skill-track {
  height: 6px;
  background: var(--surface2);
  border-radius: 99px;
  position: relative;
  overflow: visible;
}

.skill-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 1s cubic-bezier(0.16,1,0.3,1);
}

.skill-fill--language  { background: linear-gradient(90deg, var(--accent2), #a78bfa); }
.skill-fill--framework { background: linear-gradient(90deg, var(--accent), #22d3ee); }
.skill-fill--tool      { background: linear-gradient(90deg, var(--accent3), #f97316); }

.skill-ticks { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
.tick {
  position: absolute;
  top: -2px;
  width: 1px;
  height: 10px;
  background: var(--bg);
  transform: translateX(-50%);
}

/* ── TRANSITIONS ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to   { opacity: 0; transform: translateY(-6px); }

/* ── RESPONSIVE ── */
@media (max-width: 900px) {
  .stats-row       { grid-template-columns: repeat(2, 1fr); }
  .bottom-grid     { grid-template-columns: 1fr; }
  .gantt-years     { padding-left: 100px; }
  .gantt-label     { width: 90px; }
}

@media (max-width: 600px) {
  .resume-dashboard { padding: 1.5rem 1rem; }
  .stats-row        { grid-template-columns: repeat(2, 1fr); }
  .dash-header      { flex-direction: column; gap: 1rem; }
  .skills-grid      { grid-template-columns: 1fr; }
  .gantt-years      { display: none; }
}
</style>