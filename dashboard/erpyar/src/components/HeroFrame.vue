<script setup>
import AmbientGlow from './AmbientGlow.vue';
import CTACluster from './CTACluster.vue';

defineProps({
  badge: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  primaryCtaText: {
    type: String,
    required: true
  },
  secondaryCtaText: {
    type: String,
    default: ''
  }
});

defineEmits(['primaryClick']);
</script>

<template>
  <section class="hero-frame page-card">
    <AmbientGlow />
    
    <div class="hero-content">
      <span v-if="badge" class="badge-premium">{{ badge }}</span>
      <h1 class="hero-title" v-html="title"></h1>
      <p class="hero-subtitle">{{ subtitle }}</p>
      
      <div class="hero-actions-container">
        <CTACluster 
          :primary-text="primaryCtaText" 
          :secondary-text="secondaryCtaText"
          @primary-click="$emit('primaryClick')"
        />
      </div>
    </div>

    <!-- Right Side Visual / Browser Mockup -->
    <div class="hero-visual">
      <slot name="visual">
        <!-- Default fallback visual -->
        <div class="browser-mockup">
          <div class="browser-header">
            <div class="browser-buttons">
              <span class="dot dot-red"></span>
              <span class="dot dot-yellow"></span>
              <span class="dot dot-green"></span>
            </div>
            <div class="browser-address">🔒 your-company.erpyar.ir</div>
          </div>
          <div class="browser-body"></div>
        </div>
      </slot>
    </div>
  </section>
</template>

<style scoped>
.hero-frame {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 40px;
  align-items: center;
  padding: clamp(30px, 5vw, 60px) !important;
  background: radial-gradient(circle at 0% 0%, rgba(195, 155, 98, 0.08), transparent 50%), var(--erpyar-bg-surface);
  position: relative;
  z-index: 10;
  border-radius: var(--erpyar-radius-xl) !important;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  z-index: 2;
}

.badge-premium {
  align-self: flex-start;
  font-size: 11.5px;
  font-weight: 800;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(195, 155, 98, 0.08);
  color: var(--erpyar-primary);
  border: 1px solid rgba(195, 155, 98, 0.2);
}

.hero-title {
  font-size: clamp(28px, 3.8vw, 42px);
  line-height: 1.3;
  margin: 0;
  font-weight: 900;
  color: var(--erpyar-text-primary);
  letter-spacing: -1px;
}

.hero-subtitle {
  font-size: clamp(14px, 1.5vw, 16px);
  line-height: 1.8;
  color: var(--erpyar-text-secondary);
  margin: 0;
}

.hero-actions-container {
  margin-top: 10px;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;
  position: relative;
  z-index: 2;
}

/* Fallback browser mockup */
.browser-mockup {
  width: 100%;
  max-width: 440px;
  border-radius: var(--erpyar-radius-lg);
  border: 1px solid var(--erpyar-border-light);
  background: var(--erpyar-bg-surface);
  box-shadow: var(--erpyar-shadow-premium);
  overflow: hidden;
}

.browser-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--erpyar-border-light);
}

.browser-buttons {
  display: flex;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.dot-red { background-color: #f87171; }
.dot-yellow { background-color: #fbbf24; }
.dot-green { background-color: #34d399; }

.browser-address {
  font-size: 11px;
  font-family: monospace;
  color: var(--erpyar-text-muted);
}

.browser-body {
  height: 200px;
  background: rgba(0, 0, 0, 0.1);
}

@media (max-width: 1024px) {
  .hero-frame {
    grid-template-columns: 1fr;
    padding: 30px 20px !important;
    gap: 30px;
  }
}
</style>
