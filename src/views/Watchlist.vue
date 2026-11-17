<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AttventureIcon from '@/components/AttventureIcon.vue'
import MovieList from '@/components/MovieList.vue'

const loading = ref(true)
let introTimer: number | undefined

onMounted(() => {
  introTimer = window.setTimeout(() => { loading.value = false }, 3500)
})

onBeforeUnmount(() => {
  if (introTimer) window.clearTimeout(introTimer)
})
</script>

<template>
  <Transition name="intro" mode="out-in">
    <AttventureIcon v-if="loading" />
    <MovieList v-else />
  </Transition>
</template>

<style scoped>
.intro-enter-active,
.intro-leave-active { transition: opacity 180ms ease; }
.intro-enter-from,
.intro-leave-to { opacity: 0; }
</style>
