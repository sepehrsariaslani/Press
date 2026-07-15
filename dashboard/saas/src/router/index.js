import { createRouter, createWebHistory } from 'vue-router';
import LandingPage from '@/pages/LandingPage.vue';
import ServicesPage from '@/pages/ServicesPage.vue';
import ClubPage from '@/pages/ClubPage.vue';
import ReservePage from '@/pages/ReservePage.vue';
import WifiPage from '@/pages/WifiPage.vue';
import PricingPage from '@/pages/PricingPage.vue';
import FaqPage from '@/pages/FaqPage.vue';
import CustomerServicesPage from '@/pages/CustomerServicesPage.vue';
import OtherExpensesPage from '@/pages/OtherExpensesPage.vue';
import CustomersPage from '@/pages/CustomersPage.vue';
import BlogPage from '@/pages/BlogPage.vue';
import AboutUsPage from '@/pages/AboutUsPage.vue';
import ContactPage from '@/pages/ContactPage.vue';
import AppsPage from '@/pages/AppsPage.vue';
import TrialsPage from '@/pages/TrialsPage.vue';
import BillingPage from '@/pages/BillingPage.vue';
import CustomerPortalPage from '@/pages/CustomerPortalPage.vue';

const routes = [
  { path: '/', component: LandingPage },
  { path: '/services', component: ServicesPage },
  { path: '/club', component: ClubPage },
  { path: '/reserve', component: ReservePage },
  { path: '/wifi', component: WifiPage },
  { path: '/pricing', component: PricingPage },
  { path: '/faq', component: FaqPage },
  { path: '/customer-services', component: CustomerServicesPage },
  { path: '/other-expenses', component: OtherExpensesPage },
  { path: '/customers', component: CustomersPage },
  { path: '/blog', component: BlogPage },
  { path: '/about-us', component: AboutUsPage },
  { path: '/contact', component: ContactPage },
  { path: '/apps', component: AppsPage },
  { path: '/trials', component: TrialsPage },
  { path: '/billing', component: BillingPage },
  { path: '/portal', component: CustomerPortalPage },
];

const router = createRouter({
  history: createWebHistory('/saas-app/'),
  routes,
});

export default router;
