<template>
  <div class="ambient-glow-container">
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
  </div>
</template>

<style scoped>
.ambient-glow-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(140px);
  opacity: 0.12;
  transition: all 1s ease;
  animation: float 25s infinite alternate ease-in-out;
}

.glow-1 {
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, var(--erpyar-primary) 0%, transparent 80%);
  top: -150px;
  left: -100px;
}

.glow-2 {
  width: 550px;
  height: 550px;
  background: radial-gradient(circle, var(--erpyar-accent) 0%, transparent 80%);
  bottom: 10%;
  right: -200px;
  animation-delay: -10s;
}

@keyframes float {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(60px, 40px) scale(1.1);
  }
  100% {
    transform: translate(-30px, -60px) scale(0.9);
  }
}

@media (prefers-reduced-motion: reduce) {
  .glow {
    animation: none !important;
  }
}
</style>
