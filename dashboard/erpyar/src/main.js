import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { installSeo } from './seo';
import './styles.css';

document.documentElement.lang = 'fa';
document.documentElement.dir = 'rtl';

installSeo(router);

createApp(App).use(router).mount('#app');
