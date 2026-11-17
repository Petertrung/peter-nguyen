<script setup lang="ts">
import { computed, ref } from 'vue'
import PageNavigation from '@/components/PageNavigation.vue'

type BusinessCategory = 'production' | 'technology' | 'ventures'

interface BusinessContact {
  label: string
  href: string
  kind: 'email' | 'linkedin' | 'phone' | 'other'
}

interface Business {
  id: string
  name: string
  category: BusinessCategory
  description: string
  logo?: string
  website?: string
  contacts: BusinessContact[]
}

const categories: { id: BusinessCategory; label: string; index: string; description: string }[] = [
  { id: 'production', label: 'Creative & production', index: '01', description: 'Films, content, and creative services.' },
  { id: 'technology', label: 'Technology', index: '02', description: 'Digital products and software ventures.' },
  { id: 'ventures', label: 'Other ventures', index: '03', description: 'New ideas and businesses in progress.' },
]

// Add businesses here. Keep contact links explicit (mailto:, tel:, or a full URL).
const businesses: Business[] = [{
  id: '4n',
  name: '4N Productions',
  category: 'production',
  description: 'Creative director, producer, and founder of this portfolio.',
  logo: '/src/assets/images/companies/4n logo.png',
  website: 'https://4nproduction.com/',
  contacts: [
    { label: 'Email', href: 'mailto:hello@4nproductions.com', kind: 'email' }
  ]
}]

const activeCategory = ref<BusinessCategory>('production')
const activeCategoryInfo = computed(() => categories.find(({ id }) => id === activeCategory.value)!)
const visibleBusinesses = computed(() => businesses.filter(({ category }) => category === activeCategory.value))

function categoryCount(category: BusinessCategory): string {
  return String(businesses.filter((business) => business.category === category).length).padStart(2, '0')
}

function contactIcon(kind: BusinessContact['kind']): string {
  return ({ email: '✉', linkedin: 'in', phone: '↗', other: '↗' })[kind]
}
</script>

<template>
  <main class="business-shell">
    <div class="topbar"><PageNavigation /><span class="topbar-note">INDEPENDENT WORK / 2026</span></div>

    <header class="business-header">
      <div class="heading-copy">
        <p class="eyebrow"><span></span> BUSINESS DIRECTORY · SEATTLE, WA</p>
        <h1>Good ideas,<br /><span>in motion.</span></h1>
        <p class="intro">A growing collection of companies, projects, and ventures I’m building or helping bring to life.</p>
      </div>
      <div class="header-index" aria-hidden="true"><span>PORTFOLIO</span><strong>03</strong><span>AREAS OF WORK</span></div>
    </header>

    <section class="directory" aria-label="Business directory">
      <div class="directory-heading">
        <div>
          <p class="eyebrow">SELECT AN AREA</p>
          <h2>Businesses <span>&amp; ventures</span></h2>
        </div>
        <span class="directory-count">{{ String(businesses.length).padStart(2, '0') }} LISTED</span>
      </div>

      <div class="category-tabs" role="tablist" aria-label="Business categories">
        <button
          v-for="category in categories"
          :key="category.id"
          class="category-tab"
          :class="{ active: activeCategory === category.id }"
          type="button"
          role="tab"
          :aria-selected="activeCategory === category.id"
          :aria-controls="`business-panel-${category.id}`"
          @click="activeCategory = category.id"
        >
          <span class="tab-index">{{ category.index }}</span>
          <span class="tab-copy"><span class="tab-label">{{ category.label }}</span><span class="tab-description">{{ category.description }}</span></span>
          <span class="tab-count">{{ categoryCount(category.id) }}</span>
        </button>
      </div>

      <div
        :id="`business-panel-${activeCategory}`"
        class="business-panel"
        role="tabpanel"
        :aria-label="activeCategoryInfo.label"
        tabindex="0"
      >
        <Transition name="panel" mode="out-in">
          <div :key="activeCategory" class="panel-content">
            <template v-if="visibleBusinesses.length">
              <article v-for="(business, index) in visibleBusinesses" :key="business.id" class="business-card">
                <div class="business-card-top">
                  <div class="business-logo">
                    <img v-if="business.logo" :src="business.logo" :alt="`${business.name} logo`" loading="lazy" />
                    <span v-else aria-hidden="true">{{ business.name.slice(0, 1).toUpperCase() }}</span>
                  </div>
                  <span class="business-number">{{ String(index + 1).padStart(2, '0') }}</span>
                </div>
                <div class="business-copy">
                  <p class="business-category">{{ activeCategoryInfo.label }}</p>
                  <h3>{{ business.name }}</h3>
                  <p class="business-description">{{ business.description }}</p>
                </div>
                <div class="business-links">
                  <a v-if="business.website" class="website-link" :href="business.website" target="_blank" rel="noopener noreferrer">
                    Visit website <span aria-hidden="true">↗</span>
                  </a>
                  <a
                    v-for="contact in business.contacts"
                    :key="`${business.id}-${contact.href}`"
                    class="contact-link"
                    :href="contact.href"
                    :aria-label="`${contact.label} for ${business.name}`"
                    :title="contact.label"
                  >{{ contactIcon(contact.kind) }}</a>
                </div>
              </article>
            </template>

            <div v-else class="empty-state">
              <span class="empty-mark" aria-hidden="true">✳</span>
              <p class="eyebrow">{{ activeCategoryInfo.index }} / IN THE WORKS</p>
              <h3>Coming <span>soon.</span></h3>
              <p>Business details, links, and the right contact will live here as this section grows.</p>
            </div>
          </div>
        </Transition>
      </div>
    </section>

    <footer class="page-footer"><span>THOUGHTFULLY BUILT, ONE STEP AT A TIME</span><span>© 2026 PETER NGUYEN</span></footer>
  </main>
</template>

<style scoped>
.business-shell { --accent: #c2b3ff; min-height: 100vh; padding: 0 clamp(1.25rem, 6.2vw, 7.5rem) 1.5rem; color: #f2f1ed; background: #121514; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.topbar { display: flex; min-height: 88px; align-items: center; justify-content: space-between; gap: 1rem; border-bottom: 1px solid rgba(255,255,255,.1); }
.topbar-note, .eyebrow, .directory-count, .business-number, .business-category, .page-footer { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; text-transform: uppercase; }
.topbar-note { color: #858b85; font-size: .61rem; }
.business-header { display: flex; max-width: 1440px; align-items: end; justify-content: space-between; gap: 2rem; margin: 0 auto; padding: clamp(3.5rem, 9vh, 6.5rem) 0 4rem; }
.heading-copy { max-width: 720px; }
.eyebrow { display: flex; align-items: center; gap: 10px; margin: 0; color: #9ea49e; font-size: .64rem; font-weight: 500; line-height: 1.5; }
.heading-copy > .eyebrow span { width: 24px; height: 1px; background: var(--accent); }
h1 { margin: 1.3rem 0 1rem; color: #f1f0eb; font-size: clamp(3.4rem, 8vw, 7rem); font-weight: 550; line-height: .92; letter-spacing: -.08em; }
h1 span { color: var(--accent); }
.intro { max-width: 480px; margin: 0; color: #a5aaa4; font-size: clamp(.95rem, 1.5vw, 1.08rem); line-height: 1.7; }
.header-index { display: flex; min-width: 128px; flex-direction: column; gap: 7px; padding: 0 0 6px 17px; border-left: 1px solid rgba(194,179,255,.35); color: #7d847d; font: 500 .57rem/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; }
.header-index strong { color: var(--accent); font: 450 3rem/.9 Inter, ui-sans-serif, system-ui, sans-serif; letter-spacing: -.08em; }
.directory { max-width: 1440px; margin: 0 auto; border: 1px solid rgba(255,255,255,.13); border-radius: 6px; background: rgba(255,255,255,.022); box-shadow: 0 30px 90px rgba(0,0,0,.2); }
.directory-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding: 1.4rem 1.5rem 1.25rem; }
.directory-heading h2 { margin: .45rem 0 0; color: #f0efe9; font-size: clamp(1.45rem, 3vw, 2rem); font-weight: 520; letter-spacing: -.055em; }
.directory-heading h2 span { color: #929991; font-weight: 430; }
.directory-count { padding-bottom: 4px; color: var(--accent); font-size: .58rem; white-space: nowrap; }
.category-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid rgba(255,255,255,.1); border-bottom: 1px solid rgba(255,255,255,.1); }
.category-tab { position: relative; display: flex; min-width: 0; min-height: 92px; align-items: flex-start; gap: 12px; padding: 1rem 1.1rem; border: 0; border-right: 1px solid rgba(255,255,255,.1); color: #a1a69f; background: transparent; text-align: left; cursor: pointer; transition: color 180ms ease, background-color 180ms ease; }
.category-tab:last-child { border-right: 0; }
.category-tab.active { color: #f2f1ed; background: rgba(194,179,255,.055); }
.category-tab.active::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: var(--accent); content: ''; }
.tab-index { padding-top: 2px; color: #686f69; font: 500 .58rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
.category-tab.active .tab-index { color: var(--accent); }
.tab-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 6px; }
.tab-label { color: inherit; font-size: .78rem; font-weight: 550; line-height: 1.35; }
.tab-description { color: #777e78; font-size: .67rem; line-height: 1.45; }
.tab-count { color: #737a73; font: 500 .58rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
.category-tab.active .tab-count { color: var(--accent); }
.business-panel { min-height: 310px; outline: none; }
.panel-content { min-height: 310px; }
.empty-state { display: flex; min-height: 310px; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1.5rem; text-align: center; }
.empty-mark { display: grid; width: 42px; height: 42px; place-items: center; margin-bottom: 1rem; border: 1px solid rgba(194,179,255,.28); border-radius: 50%; color: var(--accent); font-size: 1.1rem; }
.empty-state h3 { margin: .7rem 0 .45rem; color: #f1f0eb; font-size: clamp(2rem, 5vw, 3rem); font-weight: 520; letter-spacing: -.065em; }
.empty-state h3 span { color: var(--accent); }
.empty-state > p:last-child { max-width: 390px; margin: 0; color: #929991; font-size: .84rem; line-height: 1.65; }
.business-card { display: grid; grid-template-columns: 90px minmax(0, 1fr) auto; align-items: center; gap: 1.25rem; padding: 1.4rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,.09); }
.business-card:last-child { border-bottom: 0; }
.business-card-top { display: flex; align-items: center; gap: .7rem; }
.business-logo { display: grid; width: 64px; height: 64px; overflow: hidden; place-items: center; border: 1px solid rgba(255,255,255,.12); border-radius: 5px; color: var(--accent); background: rgba(194,179,255,.07); font-size: 1.2rem; font-weight: 600; }
.business-logo img { width: 100%; height: 100%; object-fit: contain; }
.business-number { color: #697069; font-size: .56rem; }
.business-category { margin: 0 0 .35rem; color: var(--accent); font-size: .55rem; }
.business-copy h3 { margin: 0; color: #f0efe9; font-size: 1.1rem; font-weight: 550; letter-spacing: -.035em; }
.business-description { max-width: 620px; margin: .4rem 0 0; color: #a0a69f; font-size: .8rem; line-height: 1.55; }
.business-links { display: flex; align-items: center; gap: .55rem; }
.website-link { display: inline-flex; align-items: center; gap: .5rem; padding: .6rem .75rem; border: 1px solid rgba(194,179,255,.25); border-radius: 4px; color: #e6e1fb; font-size: .68rem; text-decoration: none; transition: border-color 160ms ease, background-color 160ms ease; }
.website-link span { color: var(--accent); }
.contact-link { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgba(255,255,255,.13); border-radius: 4px; color: #b9bcb5; font: 600 .7rem/1 Inter, ui-sans-serif, system-ui, sans-serif; text-decoration: none; transition: color 160ms ease, border-color 160ms ease; }
.page-footer { display: flex; max-width: 1440px; justify-content: space-between; gap: 1rem; margin: 2rem auto 0; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,.1); color: #747b74; font-size: .55rem; }
.panel-enter-active, .panel-leave-active { transition: opacity 160ms ease, transform 180ms cubic-bezier(.2,.8,.2,1); }
.panel-enter-from { opacity: 0; transform: translateY(5px); }
.panel-leave-to { opacity: 0; transform: translateY(-3px); }
@media (hover: hover) and (pointer: fine) { .category-tab:hover { color: #f2f1ed; background-color: rgba(194,179,255,.04); }.website-link:hover { border-color: rgba(194,179,255,.5); background: rgba(194,179,255,.07); }.contact-link:hover { border-color: rgba(194,179,255,.45); color: var(--accent); } }
@media (max-width: 700px) { .business-shell { padding-right: 1rem; padding-left: 1rem; }.topbar { min-height: 74px; }.topbar-note { font-size: .52rem; text-align: right; }.business-header { align-items: flex-start; padding: 3.5rem 0 2.5rem; }.header-index { min-width: auto; }.header-index strong { font-size: 2.3rem; }.directory-heading { padding: 1.1rem 1rem; }.category-tabs { grid-template-columns: 1fr; }.category-tab { min-height: 67px; padding: .8rem 1rem; border-right: 0; border-bottom: 1px solid rgba(255,255,255,.08); }.category-tab:last-child { border-bottom: 0; }.category-tab.active::after { top: 0; right: auto; bottom: 0; width: 2px; height: auto; }.tab-description { display: none; }.business-card { grid-template-columns: 56px minmax(0, 1fr); gap: .8rem; padding: 1rem; }.business-logo { width: 50px; height: 50px; }.business-number { display: none; }.business-links { grid-column: 2; flex-wrap: wrap; }.page-footer { font-size: .48rem; } }
@media (max-width: 430px) { .header-index { display: none; }.directory-count { font-size: .5rem; }.page-footer { flex-direction: column; gap: .5rem; }.business-links { gap: .4rem; } }
@media (prefers-reduced-motion: reduce) { .panel-enter-active, .panel-leave-active, .category-tab, .website-link, .contact-link { transition-duration: .01ms; } }
</style>
