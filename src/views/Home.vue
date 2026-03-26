<script setup lang="ts">
import TitleSection from '@/components/TitleSection.vue';
import BioSection from '@/components/BioSection.vue';

import IconComputer from '@/components/icons/IconComputer.vue';
import IconCreative from '@/components/icons/IconCreative.vue';
import IconBusiness from '@/components/icons/IconBusiness.vue';

import { store } from '@/store/store';

const handleChange = () => {
  if (store.tabIndex >= 2) {
    store.tabIndex = 0
  } else {
    store.tabIndex++
  }
}
</script>

<template>
  <div class="jumbotron">
    <header>
      <div class="wrapper">
        <TitleSection msg="Trung Peter Nguyen" />
      </div>
    </header>
    <i v-on:click="handleChange()" class="cursor">
      <IconComputer v-if="store.tabIndex === 0" />
      <IconCreative v-if="store.tabIndex === 1" />
      <IconBusiness v-if="store.tabIndex === 2" />
    </i>
    <main>
      <BioSection :handleChange="handleChange" />
    </main>
  </div>
</template>

<style scoped>
@keyframes bounceIn {

  /* idle for most of the duration */
  0% {
    transform: translateY(0);
    opacity: 1;
  }

  /* bounce happens in a small window */
  5% {
    transform: translateY(-20px);
  }

  10% {
    transform: translateY(0);
  }

  15% {
    transform: translateY(-10px);
  }

  20% {
    transform: translateY(0);
  }

  /* idle for the rest */
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.jumbotron {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto;
  align-items: center;
  justify-items: center;
  min-height: 100vh;
}

header {
  align-self: end;
  padding-bottom: 2rem;
  line-height: 1.5;
  width: 100%;
  text-align: center;
}

i {
  align-self: center;
  width: 60px;
  height: 60px;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  background: var(--color-background);
  border-radius: 8px;
  display: flex;
  place-items: center;
  place-content: center;
  animation: bounceIn 5s ease 25s infinite;
  flex-shrink: 0;
}

i:hover {
  animation-play-state: paused;
  transform: translateY(-7px);
}

main {
  align-self: start;
  padding-top: 2rem;
  width: 100%;
}

@media (min-width: 1024px) {
  .jumbotron {
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: 1fr;
    min-height: 100vh;
  }

  header {
    align-self: center;
    padding-bottom: 0;
    text-align: initial;
    padding-right: calc(var(--section-gap) / 2);
  }

  header .wrapper {
    display: flex;
    width: 100%;
    place-items: flex-start;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  main {
    align-self: center;
    padding-top: 0;
  }

  i {
    width: 50px;
    height: 50px;
  }
}
</style>
