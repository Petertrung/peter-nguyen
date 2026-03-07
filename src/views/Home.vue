<script setup lang="ts">
import TitleSection from '@/components/TitleSection.vue';
import BioSection from '@/components/BioSection.vue';
</script>

<template>
  <span style="display: contents">
    <header>
      <div class="wrapper">
        <TitleSection msg="Trung Peter Nguyen" />
      </div>
    </header>

    <main>
      <BioSection />
    </main>
  </span>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
