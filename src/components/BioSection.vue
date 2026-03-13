<script setup lang="ts">
import WelcomeItem from './WelcomeItem.vue'

import { store } from '@/store/store';

const props = defineProps({
  handleChange: {
    type: Function,
    required: true,
  }
});
</script>

<template>
  <Transition>
    <WelcomeItem v-if="store.tabIndex === 0" :handleChange="handleChange" to="/resume">
      <template #icon>
        <ComputerIcon />
      </template>
      <template #heading>Resume</template>
      I’m a front‑end application developer with experience building production‑ready software for financial
      institutions,
      government agencies, and startups. Since 2023, I’ve worked as an Application Developer for the City of Seattle,
      and
      before that I contributed to teams at Shield Compliance and Columbia Bank, modernizing interfaces, improving
      reliability, and delivering features used daily by thousands of users. My background spans JavaScript, TypeScript,
      Vue,
      Angular, React, SQL, and full SDLC practices, with a strong focus on usability, maintainability, and solving real
      problems for real people.
    </WelcomeItem>
  </Transition>
  <Transition>
    <WelcomeItem v-if="store.tabIndex === 1" :handleChange="handleChange" to="/portfolio">
      <template #icon>
        <IconCreative />
      </template>
      <template #heading>Portfolio</template>

      I run 4N Productions, where I create clean, modern, story‑driven video content for businesses looking to elevate
      their
      brand. My work ranges from professional videography to web services, helping companies present themselves with
      clarity
      and confidence. I focus on capturing authentic visuals and delivering polished edits that support marketing,
      storytelling, and client engagement.
    </WelcomeItem>
  </Transition>
  <Transition>
    <WelcomeItem v-if="store.tabIndex === 2" :handleChange="handleChange" to="/business">
      <template #icon>
        <IconBusiness />
      </template>
      <template #heading>Businesses</template>

      I’m an entrepreneur and builder currently open to new opportunities. I’ve founded multiple projects, including
      ParkSpot — a React Native app designed to simplify finding and reserving parks and athletic fields — and 4N
      Productions, a creative services company. I enjoy identifying problems, designing solutions, and turning ideas
      into
      real, usable products.
    </WelcomeItem>
  </Transition>
</template>
