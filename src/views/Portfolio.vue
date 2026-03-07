<!-- src/views/Portfolio.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'

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
    <div class="portfolio">
        <header class="portfolio-header">
            <h1>Portfolio</h1>
            <div class="filters">
                <button v-for="f in filters" :key="f" :class="['filter-btn', { active: activeFilter === f }]"
                    @click="activeFilter = f">
                    {{ f }}
                </button>
            </div>
        </header>

        <div class="grid">
            <div v-for="video in filtered" :key="video.id" class="card">
                <a :href="`https://www.youtube.com/watch?v=${video.id}`" target="_blank" rel="noopener">
                    <div class="thumbnail">
                        <img :src="`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`" :alt="video.title" />
                        <span class="badge">{{ video.type }}</span>
                    </div>
                    <p class="title">{{ video.title }}</p>
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.portfolio {
    padding: 2rem;
    width: 70vw;
    align-items: flex-start;
    margin: 0 auto;
    min-height: 100vh;
}

.portfolio-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
}

h1 {
    font-size: 2rem;
    color: var(--color-heading);
}

.filters {
    display: flex;
    gap: 0.5rem;
}

.filter-btn {
    padding: 0.3rem 0.8rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    text-transform: capitalize;
    font-size: 0.85rem;
    transition: all 0.2s ease;
}

.filter-btn.active,
.filter-btn:hover {
    background: var(--color-text);
    color: var(--color-background);
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}

.card a {
    text-decoration: none;
    color: inherit;
}

.thumbnail {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    aspect-ratio: 16/9;
}

.thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.card:hover .thumbnail img {
    transform: scale(1.05);
}

.badge {
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    text-transform: capitalize;
}

.title {
    margin-top: 0.5rem;
    font-size: 0.95rem;
    color: var(--color-text);
}
</style>