<script setup lang="ts">
const positions = ['Software Developer','Creative','Business'];
defineProps<{
  msg: string
}>()
</script>

<template>
  <div class="greetings">
    <h1 class="blue">{{ msg }}</h1>
    <h3 class="roles">
  [ "{{ positions[0] }}", "{{ positions[1] }}", "{{ positions[2] }}" ]
</h3>

  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}

.roles {
  font-family: "JetBrains Mono", monospace;
  font-size: 1.1rem;
  opacity: 0.9;
  letter-spacing: 0.5px;
}

</style>
