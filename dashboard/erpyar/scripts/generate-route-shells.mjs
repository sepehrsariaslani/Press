import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const SHELL_PATH = path.resolve(ROOT, '../../press/www/erpyar-app.html');

const routes = [
  {
    route: '/',
    page: 'erpyar-app',
    title: 'صفحه اصلی | ارپ یار',
    description:
      'ارپ یار بستری برای معرفی، فروش، استقرار و مدیریت اپلیکیشن های مبتنی بر Frappe در کنار زیرساخت Press است.',
    body: {
      title: 'راهکارهای Frappe و ERPNext برای کسب وکارهای ایرانی',
      description:
        'ارپ یار به کسب وکارهای ایرانی کمک می کند استقرار، توسعه و بهره برداری از راهکارهای ERP و CRM را سریع تر و مطمئن تر پیش ببرند.',
    },
  },
  {
    route: '/products',
    page: 'erpyar-app-products',
    title: 'محصولات | ارپ یار',
    description:
      'معرفی محصولات ارپ یار شامل ERPNext، CRM، منابع انسانی و میزبانی مدیریت شده روی Press.',
    body: {
      title: 'محصولات ارپ یار',
      description:
        'در این صفحه با سبد کامل راهکارهای ارپ یار برای مدیریت عملیات، فروش، سرمایه انسانی و زیرساخت آشنا می شوید.',
    },
  },
  {
    route: '/products/erpnext',
    page: 'erpyar-app-products-erpnext',
    title: 'ERPNext | ارپ یار',
    description:
      'راهکار ERPNext ارپ یار برای مدیریت مالی، فروش، خرید، انبار و فرآیندهای یکپارچه سازمانی.',
    body: {
      title: 'ERPNext برای سازمان های ایرانی',
      description:
        'ERPNext در ارپ یار برای یکپارچه سازی فرآیندهای کلیدی سازمان و گزارش دهی مدیریتی قابل توسعه ارائه می شود.',
    },
  },
  {
    route: '/products/crm',
    page: 'erpyar-app-products-crm',
    title: 'CRM | ارپ یار',
    description:
      'راهکار CRM ارپ یار برای مدیریت سرنخ، فرصت فروش و بهبود چرخه تعامل با مشتری.',
    body: {
      title: 'CRM یکپارچه برای تیم فروش',
      description:
        'با CRM ارپ یار می توانید قیف فروش را شفاف کنید، پیگیری مشتریان را استاندارد کنید و نرخ تبدیل را بهبود دهید.',
    },
  },
  {
    route: '/products/hr',
    page: 'erpyar-app-products-hr',
    title: 'منابع انسانی | ارپ یار',
    description:
      'راهکار منابع انسانی ارپ یار برای مدیریت فرآیندهای پرسنلی، حضور و ارزیابی عملکرد.',
    body: {
      title: 'مدیریت منابع انسانی با رویکرد عملیاتی',
      description:
        'ماژول منابع انسانی ارپ یار برای ساده سازی درخواست ها، ارزیابی ها و مدیریت تجربه کارکنان طراحی شده است.',
    },
  },
  {
    route: '/products/hosting',
    page: 'erpyar-app-products-hosting',
    title: 'میزبانی و استقرار روی Press | ارپ یار',
    description:
      'میزبانی مدیریت شده روی Press برای سرویس های Frappe شامل بکاپ، پایش و استقرار امن.',
    body: {
      title: 'زیرساخت پایدار بر بستر Press',
      description:
        'خدمات میزبانی ارپ یار شامل پایش، بکاپ و مدیریت انتشار است تا سرویس ها با ریسک عملیاتی پایین اجرا شوند.',
    },
  },
  {
    route: '/marketplace',
    page: 'erpyar-app-marketplace',
    title: 'مارکت پلیس | ارپ یار',
    description:
      'پیش نمایش افزونه های سازگار با Press از جمله پیامک، درگاه پرداخت و گزارش ساز فارسی.',
    body: {
      title: 'مارکت پلیس افزونه های سازگار',
      description:
        'در مارکت پلیس ارپ یار می توانید افزونه های آماده نصب را برای توسعه سریع تر قابلیت های سازمان بررسی کنید.',
    },
  },
  {
    route: '/pricing',
    page: 'erpyar-app-pricing',
    title: 'تعرفه ها | ارپ یار',
    description:
      'پلن های تعرفه ارپ یار برای شروع، رشد و سازمان های بزرگ با مدل پشتیبانی متناسب.',
    body: {
      title: 'تعرفه های سرویس ارپ یار',
      description:
        'ساختار تعرفه ارپ یار برای سناریوهای مختلف کسب وکار طراحی شده و پس از نیازسنجی نهایی می شود.',
    },
  },
  {
    route: '/docs',
    page: 'erpyar-app-docs',
    title: 'مستندات | ارپ یار',
    description:
      'راهنمای استقرار، مهاجرت داده و پشتیبانی فنی برای پروژه های مبتنی بر Frappe و ERPNext.',
    body: {
      title: 'مستندات و راهنمای شروع',
      description:
        'در این بخش مسیر شروع پروژه، استقرار و الزامات پشتیبانی برای تیم های فنی و عملیاتی توضیح داده شده است.',
    },
  },
  {
    route: '/contact',
    page: 'erpyar-app-contact',
    title: 'تماس با ما | ارپ یار',
    description:
      'برای دریافت مشاوره، بررسی نیاز پروژه و شروع همکاری با تیم ارپ یار تماس بگیرید.',
    body: {
      title: 'تماس با تیم ارپ یار',
      description:
        'برای دریافت مشاوره تخصصی در زمینه ERPNext، CRM، منابع انسانی یا میزبانی مدیریت شده اطلاعات خود را ثبت کنید.',
    },
  },
  {
    route: '/demo',
    page: 'erpyar-app-demo',
    title: 'درخواست دمو | ارپ یار',
    description:
      'ثبت درخواست دمو ارپ یار برای دریافت مسیر پیشنهادی استقرار و اجرای پروژه.',
    body: {
      title: 'درخواست دمو',
      description:
        'برای هماهنگی جلسه دمو، اطلاعات سازمان و نیازمندی های اصلی خود را ارسال کنید تا تیم ارپ یار برنامه پیشنهادی ارائه دهد.',
    },
  },
];

function extractAssets(html) {
  const jsMatch = html.match(/<script type="module" crossorigin src="([^"]+)"/);
  const cssMatch = html.match(/<link rel="stylesheet" href="([^"]+)"/);
  if (!jsMatch || !cssMatch) {
    throw new Error('Unable to extract built asset paths from erpyar-app.html');
  }
  return { jsPath: jsMatch[1], cssPath: cssMatch[1] };
}

function renderShell({ title, description, route, body }, assets) {
  const canonical = `https://erpyar.ir${route}`;
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="fa_IR" />
    <meta property="og:site_name" content="ارپ یار" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <link rel="canonical" href="${canonical}" />
    <script type="module" crossorigin src="${assets.jsPath}"></script>
    <link rel="stylesheet" href="${assets.cssPath}">
  </head>
  <body>
    <div id="app"></div>
    <noscript>
      <main style="max-width:980px;margin:24px auto;padding:0 16px;font-family:Tahoma,sans-serif;line-height:1.9">
        <h1>${body.title}</h1>
        <p>${body.description}</p>
      </main>
    </noscript>

          <script>
              {% for key in boot %}
              window["{{ key }}"] = {{ boot[key] | tojson }};
              {% endfor %}
          </script>
          </body>

</html>
`;
}

function main() {
  const baseHtml = fs.readFileSync(SHELL_PATH, 'utf8');
  const assets = extractAssets(baseHtml);
  const wwwDir = path.dirname(SHELL_PATH);

  for (const route of routes) {
    const outputPath = path.join(wwwDir, `${route.page}.html`);
    fs.writeFileSync(outputPath, renderShell(route, assets), 'utf8');
  }

  console.log(`Generated ${routes.length} Erpyar prerender shell files in ${wwwDir}`);
}

main();
