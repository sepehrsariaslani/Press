<script setup>
import NavDock from '@/components/NavDock.vue';
import FooterGrid from '@/components/FooterGrid.vue';
</script>

<template>
  <div class="site-shell">
    <!-- Floating Cinematic Navbar Pill -->
    <NavDock />

    <!-- Main View Surface -->
    <main class="site-main">
      <RouterView />
    </main>

    <!-- Structured Cinematic Footer -->
    <FooterGrid />
  </div>
</template>

<style>
/* Global scroll animations and cinematic backgrounds */
html {
  scroll-behavior: smooth;
}

/* Subtle reveal on section enter */
section {
  animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }
}
</style>
