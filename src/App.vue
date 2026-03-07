<script setup lang="ts"></script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="slide" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>