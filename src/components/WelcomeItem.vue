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
    <i v-on:click="props.handleChange()" class="cursor">
      <slot name="icon"></slot>
    </i>
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

.item {
  margin-top: 2rem;
  display: flex;
  position: relative;
}

.details {
  flex: 1;
  margin-left: 1rem;
}

.side_menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  align-self: center;
}

i {
  width: 32px;
  height: 32px;
  color: var(--color-text);
  display: flex;
  place-items: center;
  place-content: center;
  animation: bounceIn 5s ease 25s infinite;
}

i:hover {
  animation-play-state: paused;
  transform: translateY(-5px);
}

h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
}

@media (min-width: 1024px) {
  .item {
    margin-top: 0;
    padding: 0.4rem 0 1rem calc(var(--section-gap) / 2);
  }

  i {
    top: calc(50% - 25px);
    left: -26px;
    position: absolute;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    border-radius: 8px;
    width: 50px;
    height: 50px;
  }

  .item:before {
    content: ' ';
    border-left: 1px solid var(--color-border);
    position: absolute;
    left: 0;
    bottom: calc(50% + 25px);
    height: calc(50% - 25px);
  }

  .item:after {
    content: ' ';
    border-left: 1px solid var(--color-border);
    position: absolute;
    left: 0;
    top: calc(50% + 25px);
    height: calc(50% - 25px);
  }

  .item:first-of-type:before {
    display: none;
  }

  .item:last-of-type:after {
    display: none;
  }

  .side_menu {
    margin-left: auto;
  }
}
</style>
