<template>
  <RouterLink class="page-back" to="/" aria-label="Back to home">
    <span class="page-back-arrow" aria-hidden="true">←</span>
    <span>Back home</span>
  </RouterLink>
</template>

<style scoped>
.page-back {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 5px;
  color: #b1b7b0;
  background: rgba(255, 255, 255, .025);
  font: 500 .68rem/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: .06em;
  text-decoration: none;
  text-transform: uppercase;
  transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.page-back-arrow { color: #a6edc6; font-size: .95rem; }

@media (hover: hover) and (pointer: fine) {
  .page-back:hover {
    color: #f2f1ed;
    border-color: rgba(166, 237, 198, .34);
    background: rgba(166, 237, 198, .06);
  }
}
</style>
