<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import softwareCharacter from '@/assets/characters/peter-software.png';
import videographerCharacter from '@/assets/characters/peter-videographer.png';
import businessCharacter from '@/assets/characters/peter-business.png';
import IconComputer from '@/components/icons/IconComputer.vue';
import IconCreative from '@/components/icons/IconCreative.vue';
import IconBusiness from '@/components/icons/IconBusiness.vue';
import { store } from '@/store/store';

const router = useRouter();

const profiles = [
  {
    eyebrow: '01 / DIGITAL CRAFT',
    role: 'Software developer',
    title: 'Building useful things\nfor real people.',
    description: 'I’m a front-end application developer creating thoughtful, production-ready software for the people who rely on it every day.',
    destination: '/resume',
    action: 'Explore my experience',
    icon: IconComputer,
    accent: 'mint',
    mark: '01',
    character: softwareCharacter,
    characterAlt: 'Peter in his software developer look, holding a laptop',
  },
  {
    eyebrow: '02 / VISUAL STORIES',
    role: 'Creative producer',
    title: 'Stories deserve\nto be seen.',
    description: 'Through 4N Productions, I make clear, story-driven video and web experiences that help good businesses show who they are.',
    destination: '/portfolio',
    action: 'View selected work',
    icon: IconCreative,
    accent: 'coral',
    mark: '02',
    character: videographerCharacter,
    characterAlt: 'Peter dressed for videography, holding a video camera',
  },
  {
    eyebrow: '03 / IDEAS INTO ACTION',
    role: 'Entrepreneur',
    title: 'A good idea is\na place to start.',
    description: 'I’m drawn to useful problems and the challenge of turning a promising idea into something people can actually use.',
    destination: '/business',
    action: 'See what I’m building',
    icon: IconBusiness,
    accent: 'violet',
    mark: '03',
    character: businessCharacter,
    characterAlt: 'Peter wearing a business suit',
  },
];

const activeProfile = computed(() => profiles[store.tabIndex] ?? profiles[0]!);

function selectProfile(index: number) {
  store.tabIndex = index;
}

function moveProfile(direction: number) {
  store.tabIndex = (store.tabIndex + direction + profiles.length) % profiles.length;
}

</script>

<template>
  <main class="home-shell" :class="`theme-${activeProfile.accent}`">
    <div class="grain" aria-hidden="true"></div>
    <nav class="topbar" aria-label="Main navigation">
      <a class="wordmark" href="https://www.linkedin.com/in/trung-peter-nguyen-47638ab6/" aria-label="Peter Nguyen, home"><span>PN</span><span class="wordmark-name">Peter Nguyen</span></a>
      <div class="topbar-meta"><span class="availability-dot"></span> Seattle, WA <span class="meta-divider">/</span> Available for what’s next</div>
      <!-- <button class="nav-link" type="button" @click="router.push('/combine')">More about me <span aria-hidden="true">↗</span></button> -->
    </nav>

    <section class="hero" aria-label="Introduction">
      <div class="hero-copy">
        <p class="intro-label"><span class="label-line"></span> A multidisciplinary maker</p>
        <h1>Hey, I’m<br /><span>Peter Nguyen<span class="period">.</span></span></h1>
        <p class="intro-copy">I bring thoughtful ideas to life across <strong>technology, creativity, and business.</strong></p>

        <div class="profile-switcher" role="tablist" aria-label="Explore my work">
          <button
            v-for="(profile, index) in profiles"
            :key="profile.role"
            class="profile-tab"
            :class="{ active: store.tabIndex === index }"
            role="tab"
            :aria-selected="store.tabIndex === index"
            :tabindex="store.tabIndex === index ? 0 : -1"
            @click="selectProfile(index)"
            @keydown.right.prevent="moveProfile(1)"
            @keydown.left.prevent="moveProfile(-1)"
          >
            <span class="tab-number">0{{ index + 1 }}</span>{{ profile.role }}
          </button>
        </div>

        <Transition name="profile" mode="out-in">
          <article :key="activeProfile.role" class="profile-card" role="tabpanel">
            <div class="card-heading"><span>{{ activeProfile.eyebrow }}</span><component :is="activeProfile.icon" class="card-icon" /></div>
            <h2>{{ activeProfile.title }}</h2>
            <p>{{ activeProfile.description }}</p>
            <button class="text-link" type="button" @click="router.push(activeProfile.destination)">
              {{ activeProfile.action }} <span class="link-arrow" aria-hidden="true">↗</span>
            </button>
          </article>
        </Transition>
      </div>

      <div class="hero-art">
        <div class="art-grid"></div>
        <div class="art-orbit"></div>
        <div class="character-stage">
          <div class="stage-label"><span>THE MANY SIDES OF PETER</span><span>0{{ store.tabIndex + 1 }} / 03</span></div>
          <Transition name="character" mode="out-in">
            <div :key="store.tabIndex" class="pixel-scene" :class="`scene-${activeProfile.accent}`">
              <img class="pixel-character" :src="activeProfile.character" :alt="activeProfile.characterAlt" />
              <span class="character-hover-detail laptop-cursor" aria-hidden="true"></span>
              <span class="character-hover-detail camera-glint" aria-hidden="true"></span>
              <span class="character-hover-detail suit-glint" aria-hidden="true"></span>
            </div>
          </Transition>
          <div class="stage-footer"><span>{{ activeProfile.role.toUpperCase() }}</span><span class="stage-spark">✳</span><span>SEATTLE, WA</span></div>
        </div>
      </div>
    </section>

    <footer class="footer"><span>DESIGNING, BUILDING & MAKING SINCE 2017</span><span class="footer-center"></span><span>© 2026 PETER NGUYEN</span></footer>
  </main>
</template>

<style scoped>
.home-shell {
  --accent: #a6edc6;
  --accent-rgb: 166, 237, 198;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  padding: 0 clamp(1.25rem, 6.2vw, 7.5rem);
  overflow: hidden;
  color: #f2f1ed;
  background: #121514;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.theme-coral { --accent: #ff9d83; --accent-rgb: 255, 157, 131; }
.theme-violet { --accent: #c2b3ff; --accent-rgb: 194, 179, 255; }
.grain { position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: .18; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.15'/%3E%3C/svg%3E"); }
.topbar { height: 88px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.1); }
.wordmark { display: inline-flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; font-size: .9rem; font-weight: 600; letter-spacing: -.02em; }
.wordmark > span:first-child { display: grid; width: 35px; height: 35px; place-items: center; border: 1px solid rgba(255,255,255,.25); border-radius: 50%; color: var(--accent); font: 600 .7rem/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
.topbar-meta, .nav-link { color: #9a9d99; font: 500 .68rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .06em; text-transform: uppercase; }
.topbar-meta { display: flex; align-items: center; gap: 10px; }
.availability-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 12px rgba(var(--accent-rgb),.7); }
.meta-divider { color: #4b504c; }
.nav-link { padding: 10px 0; border: 0; background: none; color: #e1e1dc; cursor: pointer; transition: color 180ms ease; }
.nav-link span { padding-left: 8px; color: var(--accent); }
.hero { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(2rem, 6vw, 7.5rem); align-items: center; max-width: 1440px; width: 100%; margin: 0 auto; padding: clamp(3rem, 8vh, 7rem) 0; }
.hero-copy { position: relative; z-index: 1; max-width: 650px; }
.intro-label { display: flex; align-items: center; gap: 12px; margin-bottom: 1.6rem; color: #a2a6a0; font: 500 .7rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; text-transform: uppercase; }
.label-line { display: block; width: 28px; height: 1px; background: var(--accent); }
h1 { margin: 0; color: #f1f0eb; font-size: clamp(3.5rem, 7vw, 7.4rem); font-weight: 560; line-height: .94; letter-spacing: -.075em; }
h1 > span { color: var(--accent); }
.period { color: #f1f0eb; }
.intro-copy { max-width: 450px; margin: 1.7rem 0 2.5rem; color: #a5a9a3; font-size: clamp(1rem, 1.35vw, 1.2rem); line-height: 1.7; letter-spacing: -.02em; }
.intro-copy strong { color: #e6e6e0; font-weight: 500; }
.profile-switcher { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,.12); }
.profile-tab { display: inline-flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid transparent; border-radius: 5px; color: #9b9f99; background: transparent; font: 500 .72rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; cursor: pointer; transition: color 180ms ease, border-color 180ms ease, background-color 180ms ease; }
.tab-number { color: #606660; font-size: .62rem; }
.profile-tab.active { color: #f1f0eb; border-color: rgba(var(--accent-rgb),.3); background: rgba(var(--accent-rgb),.07); }
.profile-tab.active .tab-number { color: var(--accent); }
.profile-card { min-height: 226px; padding: 1.55rem 0 0; }
.card-heading { display: flex; align-items: center; justify-content: space-between; color: var(--accent); font: 500 .63rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .12em; }
.card-icon { width: 19px; height: 19px; opacity: .8; }
.profile-card h2 { white-space: pre-line; margin: 15px 0 10px; color: #f1f0eb; font-size: clamp(1.5rem, 2.1vw, 2.05rem); font-weight: 520; line-height: 1.15; letter-spacing: -.05em; }
.profile-card > p { max-width: 510px; margin: 0; color: #a5a9a3; font-size: .9rem; line-height: 1.65; }
.text-link { display: inline-flex; align-items: center; gap: 12px; margin-top: 18px; padding: 0 0 5px; border: 0; border-bottom: 1px solid rgba(var(--accent-rgb),.45); color: #ededE7; background: none; font-size: .78rem; font-weight: 550; cursor: pointer; transition: color 180ms ease, gap 180ms ease; }
.link-arrow { color: var(--accent); font-size: 1rem; }
.hero-art { position: relative; display: grid; min-height: min(67vh, 650px); place-items: center; overflow: hidden; }
.art-grid { position: absolute; inset: 4% 1%; opacity: .22; background-image: linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px); background-size: 32px 32px; mask-image: radial-gradient(ellipse, #000 20%, transparent 75%); }
.art-orbit { position: absolute; width: 88%; aspect-ratio: 1; border: 1px solid rgba(var(--accent-rgb),.15); border-radius: 50%; transition: border-color 250ms ease; }
.character-stage { position: relative; z-index: 1; width: min(88%, 440px); height: clamp(400px, 54vh, 540px); display: flex; flex-direction: column; justify-content: space-between; padding: 20px 22px 17px; border: 1px solid rgba(255,255,255,.17); background: linear-gradient(145deg, rgba(36,42,38,.88), rgba(19,23,21,.96) 72%); box-shadow: 0 30px 100px rgba(0,0,0,.32), inset 0 1px rgba(255,255,255,.09); }
.character-stage::before { content: ""; position: absolute; inset: 10px; border: 1px solid rgba(255,255,255,.055); pointer-events: none; }
.stage-label, .stage-footer { position: relative; z-index: 4; display: flex; justify-content: space-between; color: #8d948d; font: 500 .58rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; }
.stage-label span:last-child { color: var(--accent); }
.pixel-scene { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.pixel-character { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: center bottom; image-rendering: pixelated; transition: transform 180ms cubic-bezier(.23,1,.32,1); }
.character-hover-detail { position: absolute; z-index: 2; opacity: 0; pointer-events: none; transition: opacity 160ms cubic-bezier(.23,1,.32,1), transform 160ms cubic-bezier(.23,1,.32,1); }
.laptop-cursor { top: 45%; left: 37%; width: 3px; height: 9px; background: #d2f4dc; box-shadow: 0 0 8px rgba(166,237,198,.8); }
.camera-glint { top: 34%; left: 34%; width: 28px; height: 28px; transform: translate(-50%,-50%) scale(.78); border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,.9) 0, rgba(255,225,171,.56) 20%, rgba(255,225,171,.18) 42%, transparent 72%); }
.suit-glint { top: 47%; left: 59%; width: 28px; height: 46px; transform: translateX(-8px) skewX(-14deg); background: linear-gradient(100deg, transparent 25%, rgba(255,255,255,.38) 48%, rgba(255,255,255,.06) 62%, transparent 80%); }
.stage-footer { color: #d6d8d2; align-items: center; }.stage-spark { color: var(--accent); font-size: .95rem; transition: color 200ms ease; }
.character-enter-active, .character-leave-active { transition: opacity 180ms ease; }.character-enter-from, .character-leave-to { opacity: 0; }
.footer { display: flex; justify-content: space-between; align-items: center; min-height: 62px; border-top: 1px solid rgba(255,255,255,.1); color: #777e78; font: 500 .58rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; }
.footer-center { color: #a3a8a1; }.footer-center span { padding-left: 8px; color: var(--accent); }
.profile-enter-active, .profile-leave-active { transition: opacity 180ms ease, transform 180ms cubic-bezier(.23,1,.32,1); }
.profile-enter-from { opacity: 0; transform: translateY(9px); }.profile-leave-to { opacity: 0; transform: translateY(-5px); }
@media (hover: hover) and (pointer: fine) {
  .nav-link:hover { color: var(--accent); }
  .profile-tab:hover { color: #f1f0eb; }
  .text-link:hover { gap: 17px; color: var(--accent); }
  .character-stage:hover { border-color: rgba(var(--accent-rgb),.35); }
  .character-stage:hover .pixel-character { transform: translateY(-4px); }
  .scene-mint:hover .laptop-cursor { opacity: 1; }
  .scene-coral:hover .camera-glint { opacity: 1; transform: translate(-50%,-50%) scale(1); }
  .scene-violet:hover .suit-glint { opacity: .9; transform: translateX(8px) skewX(-14deg); }
}
@media (max-width: 850px) { .home-shell { padding: 0 1.5rem; }.topbar { height: 74px; }.topbar-meta { display: none; }.hero { grid-template-columns: 1fr; gap: 1.25rem; padding: 4.5rem 0 2.25rem; }.hero-copy { max-width: none; }.hero-art { min-height: 460px; }.character-stage { width: min(78%, 440px); height: 430px; }.footer-center { display: none; } }
@media (max-width: 520px) { .home-shell { padding: 0 1.1rem; }.wordmark-name { display: none; }.hero { padding-top: 3.5rem; }.intro-label { margin-bottom: 1.25rem; }h1 { font-size: clamp(3.6rem, 16vw, 5.6rem); }.intro-copy { margin: 1.2rem 0 1.7rem; }.profile-switcher { gap: 3px; }.profile-tab { padding: 8px; font-size: .64rem; }.tab-number { display: none; }.profile-card { min-height: 242px; }.hero-art { min-height: 420px; }.character-stage { width: min(100%, 380px); height: 390px; padding: 16px; }.pixel-character { object-position: center 52%; }.footer { font-size: .5rem; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
</style>
