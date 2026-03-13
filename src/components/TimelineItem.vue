<template>
  <div class="item">
    <div class="circle"></div>
    <div class="details">
      <h3><slot name="heading"></slot></h3>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
  position: relative;
}

.item::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 14px;
  bottom: -2rem;
  width: 1px;
  background: var(--color-border);
  z-index: 0;
}

.item:last-child::before {
  display: none;
}

.circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-background);
  flex-shrink: 0;
  margin-top: 0.3rem;
  z-index: 1; /* sits on top of the line */
  position: relative;
}

.details {
  flex: 1;
}

h3 {
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
}

@media (min-width: 1024px) {
  .item::before {
    display: none;
  }

  .item {
    width: 50%;
    margin-bottom: 3rem;
  }

  .item:nth-child(odd) {
    align-self: flex-start;
    flex-direction: row-reverse;
    text-align: right;
    padding-right: 2rem;
  }

  .item:nth-child(odd) .circle {
    position: absolute;
    right: -8px;
  }

  .item:nth-child(even) {
    align-self: flex-end;
    padding-left: 2rem;
  }

  .item:nth-child(even) .circle {
    position: absolute;
    left: -8px;
  }
}
</style>