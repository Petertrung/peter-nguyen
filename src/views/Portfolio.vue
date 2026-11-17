<!-- src/views/Portfolio.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import PageNavigation from '@/components/PageNavigation.vue'

type VideoType = 'short film' | 'event' | 'vlog' | 'production'

interface Video {
    id: string
    title: string
    type: VideoType
}

const videos: Video[] = [
    { id: '9sP_asGABuY', title: 'The Gift', type: 'short film' },
    { id: 'HetAgnCrC94', title: 'Up - Retreat 2019', type: 'event' },
    { id: 'qqLE2hV0Iek', title: '2025 End Credits', type: 'short film' },
    { id: 'whmj2Y3h5po', title: 'Wedding Intro', type: 'production' },
    { id: 'YXmTvWoyVD8', title: 'Seattle to Pasadena - Head in the Clouds 2025', type: 'vlog' },
    { id: '2fslRpS_E4k', title: 'Summer 2021', type: 'event' },
    { id: 'U1UMXKM_sbY', title: '02/19-20/2022 - Olympic National Park', type: 'vlog' },
    { id: 'K5AkZEmoaEk', title: 'Choggies', type: 'short film' },
    { id: 'vZ5t_iX67XI', title: 'Jared & Shelby\'s Wedding', type: 'short film' },
    { id: 'FO47rIEXmMs', title: 'Wiley\'s Beach Adventures 05-22-2021', type: 'vlog' },
    { id: 't5iGZDRo5QI', title: 'DTDP', type: 'event' },
    { id: '2A2MuCZStMk', title: 'Camp 2019', type: 'event' }
]

const activeFilter = ref<VideoType | 'all'>('all')

const filtered = computed(() =>
    activeFilter.value === 'all'
        ? videos
        : videos.filter(v => v.type === activeFilter.value)
)

const filters: (VideoType | 'all')[] = ['all', 'short film', 'event', 'vlog', 'production']
</script>

<template>
    <main class="portfolio-shell">
        <div class="portfolio-topbar"><PageNavigation /></div>
        <header class="portfolio-header">
            <div class="title-group">
                <p class="eyebrow"><span></span> 4N PRODUCTIONS / SELECTED WORK</p>
                <h1>Stories in <span>motion.</span></h1>
                <p class="intro">A collection of films, events, and moments made along the way. - <a href="https://4nproduction.com" target="_blank" rel="noopener noreferrer">
  4N Productions
</a></p>
            </div>
            <span class="work-count">{{ String(filtered.length).padStart(2, '0') }} <i>/ {{ String(videos.length).padStart(2, '0') }} FILMS</i></span>
        </header>

        <nav class="filters" aria-label="Filter portfolio videos">
            <button v-for="f in filters" :key="f" :class="['filter-btn', { active: activeFilter === f }]"
                :aria-pressed="activeFilter === f" @click="activeFilter = f">
                {{ f }}
            </button>
        </nav>

        <section class="grid" aria-label="Selected video work">
            <article v-for="video in filtered" :key="video.id" class="card">
                <a :href="`https://www.youtube.com/watch?v=${video.id}`" target="_blank" rel="noopener noreferrer">
                    <div class="thumbnail">
                        <img :src="`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`" :alt="video.title" loading="lazy" />
                        <span class="play-mark" aria-hidden="true">↗</span>
                        <span class="badge">{{ video.type }}</span>
                    </div>
                    <div class="card-caption"><p class="title">{{ video.title }}</p><span class="card-arrow" aria-hidden="true">↗</span></div>
                </a>
            </article>
        </section>
    </main>
</template>

<style scoped>
.portfolio-shell { --accent: #a6edc6; min-height: 100vh; width: 100%; padding: 0 clamp(1.25rem, 6.2vw, 7.5rem) 4rem; color: #f2f1ed; background: #121514; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.portfolio-topbar { display: flex; align-items: center; min-height: 88px; border-bottom: 1px solid rgba(255,255,255,.1); }
.portfolio-header { max-width: 1440px; margin: 0 auto; padding: clamp(3rem, 8vh, 6rem) 0 2rem; display: flex; align-items: end; justify-content: space-between; gap: 2rem; }
.eyebrow { display: flex; align-items: center; gap: 10px; margin-bottom: 1.35rem; color: #a2a6a0; font: 500 .68rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; }
.eyebrow span { width: 24px; height: 1px; background: var(--accent); }
h1 { margin: 0; color: #f1f0eb; font-size: clamp(3rem, 6vw, 5.8rem); font-weight: 550; line-height: .98; letter-spacing: -.07em; }
h1 span { color: var(--accent); }
.intro { margin-top: 1rem; color: #a5a9a3; font-size: 1rem; line-height: 1.6; }
.work-count { padding-bottom: 5px; color: var(--accent); font: 500 .7rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; white-space: nowrap; }
.work-count i { color: #788078; font-style: normal; }
.filters { max-width: 1440px; margin: 0 auto 1.5rem; display: flex; flex-wrap: wrap; gap: 8px; }
.filter-btn { padding: 9px 12px; border: 1px solid rgba(255,255,255,.12); border-radius: 5px; background: transparent; color: #9b9f99; cursor: pointer; text-transform: capitalize; font: 500 .68rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease; }
.filter-btn.active { color: #f1f0eb; border-color: rgba(166,237,198,.34); background: rgba(166,237,198,.07); }
.grid { max-width: 1440px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 1.35rem; }
.card { min-width: 0; }
.card a { display: block; color: inherit; text-decoration: none; padding: 0; background: none; }
.card a:hover { background: none; }
.thumbnail { position: relative; overflow: hidden; aspect-ratio: 16/9; border: 1px solid rgba(255,255,255,.14); background: #1c211e; }
.thumbnail::after { content: ""; position: absolute; inset: 35% 0 0; background: linear-gradient(transparent, rgba(0,0,0,.45)); pointer-events: none; }
.thumbnail img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 220ms cubic-bezier(.23,1,.32,1); }
.play-mark { position: absolute; z-index: 1; top: 12px; right: 12px; display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgba(255,255,255,.55); border-radius: 50%; color: white; background: rgba(18,21,20,.55); opacity: 0; transform: translateY(3px); transition: opacity 160ms cubic-bezier(.23,1,.32,1), transform 160ms cubic-bezier(.23,1,.32,1); }
.badge { position: absolute; z-index: 1; bottom: 11px; left: 12px; padding: 5px 8px; border: 1px solid rgba(166,237,198,.32); color: #dff6e9; background: rgba(18,21,20,.78); font: 500 .58rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; letter-spacing: .07em; }
.card-caption { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; padding: .8rem .1rem .3rem; }
.title { margin: 0; color: #e6e6e0; font-size: .92rem; font-weight: 500; line-height: 1.45; }
.card-arrow { color: var(--accent); font-size: .9rem; opacity: .7; }
@media (hover: hover) and (pointer: fine) { .filter-btn:hover { color: #f1f0eb; border-color: rgba(166,237,198,.3); }.card:hover .thumbnail img { transform: scale(1.025); }.card:hover .play-mark { opacity: 1; transform: translateY(0); }.card:hover .card-arrow { opacity: 1; } }
@media (max-width: 700px) { .portfolio-topbar { min-height: 74px; }.portfolio-header { align-items: flex-start; flex-direction: column; padding-top: 3rem; gap: 1.25rem; }.work-count { padding: 0; }.grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); } }
@media (prefers-reduced-motion: reduce) { .thumbnail img, .play-mark { transition-duration: .01ms; } }
</style>
