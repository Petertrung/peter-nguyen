<script setup>
import { ref, onMounted } from 'vue'
import AttventureIcon from '@/components/AttventureIcon.vue'
import MovieList from '@/components/MovieList.vue'


const loading = ref(true)

onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 3500) // 3.5 seconds
})
</script>

<template>
  <div>
    <transition name="fade">
      <AttventureIcon v-if="loading" />
      <MovieList v-else />
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
