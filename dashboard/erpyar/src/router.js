import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/pages/Home.vue';
import Products from '@/pages/Products.vue';
import ProductERPNext from '@/pages/ProductERPNext.vue';
import ProductCRM from '@/pages/ProductCRM.vue';
import ProductHR from '@/pages/ProductHR.vue';
import ProductHosting from '@/pages/ProductHosting.vue';
import Marketplace from '@/pages/Marketplace.vue';
import Pricing from '@/pages/Pricing.vue';
import Docs from '@/pages/Docs.vue';
import Contact from '@/pages/Contact.vue';
import Demo from '@/pages/Demo.vue';

const routes = [
  {
    path: '/',
    component: Home,
    meta: {
      title: 'صفحه اصلی',
      description:
        'ارپ یار بستری برای معرفی، فروش، استقرار و مدیریت اپلیکیشن های Frappe و ERPNext برای کسب وکارهای ایرانی است.',
      canonicalPath: '/',
    },
  },
  {
    path: '/products',
    component: Products,
    meta: {
      title: 'محصولات',
      description: 'معرفی راهکارهای ERPNext، CRM، منابع انسانی و میزبانی مدیریت شده روی Press.',
    },
  },
  {
    path: '/products/erpnext',
    component: ProductERPNext,
    meta: {
      title: 'ERPNext',
      description: 'راهکار ERPNext برای مالی، فروش، خرید، انبار و عملیات یکپارچه کسب وکار شما.',
    },
  },
  {
    path: '/products/crm',
    component: ProductCRM,
    meta: {
      title: 'CRM',
      description: 'راهکار CRM ارپ یار برای مدیریت سرنخ، فرصت فروش و ارتباط پایدار با مشتریان.',
    },
  },
  {
    path: '/products/hr',
    component: ProductHR,
    meta: {
      title: 'منابع انسانی',
      description: 'مدیریت فرآیندهای منابع انسانی، کارکرد، ارزیابی عملکرد و تجربه کارکنان در یک پنل.',
    },
  },
  {
    path: '/products/hosting',
    component: ProductHosting,
    meta: {
      title: 'میزبانی و استقرار روی Press',
      description: 'میزبانی مدیریت شده، بکاپ، مانیتورینگ و استقرار امن سرویس های Frappe روی Press.',
    },
  },
  {
    path: '/marketplace',
    component: Marketplace,
    meta: {
      title: 'مارکت پلیس',
      description: 'پیش نمایش افزونه های سازگار با Press مانند پیامک، پرداخت و گزارش ساز فارسی.',
    },
  },
  {
    path: '/pricing',
    component: Pricing,
    meta: {
      title: 'تعرفه ها',
      description: 'پلن های نمونه ارپ یار برای شروع، رشد و سازمان های بزرگ با SLA متناسب.',
    },
  },
  {
    path: '/docs',
    component: Docs,
    meta: {
      title: 'مستندات',
      description: 'راهنمای شروع، استقرار، مهاجرت و نگهداری برای تیم های فنی و عملیاتی.',
    },
  },
  {
    path: '/contact',
    component: Contact,
    meta: {
      title: 'تماس با ما',
      description: 'راه های ارتباط با تیم ارپ یار برای دریافت مشاوره، استعلام و همکاری.',
    },
  },
  {
    path: '/demo',
    component: Demo,
    meta: {
      title: 'درخواست دمو',
      description: 'ثبت درخواست دمو برای بررسی نیازهای سازمان و ارائه مسیر پیاده سازی.',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    component: Home,
    meta: {
      title: 'صفحه اصلی',
      description: 'مسیر درخواستی یافت نشد. شما به صفحه اصلی ارپ یار هدایت شده اید.',
      canonicalPath: '/',
    },
  },
];

export default createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' };
  },
});
