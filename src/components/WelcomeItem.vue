<script setup lang="ts">
import IconArrow from './icons/IconArrow.vue';
import { useRouter } from 'vue-router'
const router = useRouter()

const props = defineProps({
  handleChange: {
    type: Function,
    required: true,
  },
  to:{
    type: String,
    required: true
  }
});

defineSlots<{
  icon(): any,
  heading(): any,
  default(): any
}>()
</script>

<template>
  <div class="item">
    <div class="details">
      <h3>
        <slot name="heading"></slot>
      </h3>
      <slot></slot>
    </div>
    <div class="side_menu cursor" v-on:click="() =>{ router.push(props.to)}">
      <icon-arrow />
    </div>
  </div>
</template>

<style scoped>
.item {
  margin-top: 2rem;
  display: flex;
  position: relative;
}

.details {
  margin-left: 1rem;
}

.side_menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  align-self: center;
}

h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
}

@media (min-width: 1024px) {
  h3 {
  font-size: 2rem;
}
  .item {
    margin-top: 0;
    padding: 0.4rem 0 1rem calc(var(--section-gap) / 2);
  }

  .side_menu {
    margin-left: auto;
  }
}
</style>
