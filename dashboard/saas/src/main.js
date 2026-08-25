import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles.css';

document.documentElement.lang = 'fa';
document.documentElement.dir = 'rtl';

createApp(App).use(router).mount('#app');
