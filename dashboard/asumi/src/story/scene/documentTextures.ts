import { CanvasTexture, SRGBColorSpace } from 'three';

export function makeDocumentTexture(index: number, dashboard: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fbf8ef';
  ctx.beginPath();
  ctx.roundRect(0, 0, 768, 640, 30);
  ctx.fill();
  const line = (x: number, y: number, width: number, color = '#e6e6da', height = 15) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x, y, width, height, height / 2); ctx.fill();
  };
  const label = (text: string, x: number, y: number, size: number, color = '#2a483b', weight = 500) => {
    ctx.font = `${weight} ${size}px "Vazirmatn Variable", sans-serif`;
    ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  };
  const titles = dashboard ? ['روند فروش', 'وضعیت دریافت‌ها', 'جریان نقدی'] : ['فاکتور فروش', 'سند هزینه', 'موجودی انبار'];
  label(titles[index % 3], 698, 85, 39, '#284a3b', 650);
  label(dashboard ? 'نمای کلی کسب‌وکار' : 'آسومی · اسناد کسب‌وکار', 698, 131, 24, '#758278');
  line(62, 168, 644, '#e5e8df', 2);
  if (!dashboard) {
    label('شماره سند  ۱۴۰۵ / ۰۲۴', 696, 231, 28);
    label('شرح', 696, 296, 24, '#8b958a');
    label('مبلغ (ریال)', 252, 296, 24, '#8b958a');
    for (let i = 0; i < 4; i++) {
      line(377, 325 + i * 51, 320 - i * 37, '#dde3d8', 14);
      line(85, 325 + i * 51, 135, '#e9e9df', 14);
    }
    line(63, 548, 642, '#eef0e6', 51);
    label('جمع کل', 676, 583, 25);
    label('۱۲٬۴۰۰٬۰۰۰', 296, 583, 30, '#51715a', 650);
  } else {
    label(['۲۴۸٬۰۰۰٬۰۰۰', '۸۷٪', '۱۸۶٬۰۰۰٬۰۰۰'][index % 3], 697, 224, 47, '#294a38', 700);
    label(index % 3 === 1 ? 'دریافت‌شده' : 'ریال', 697, 262, 24, '#7d8b7b');
    if (index % 3 === 1) {
      ctx.lineWidth = 46; ctx.strokeStyle = '#e4e9dc'; ctx.beginPath(); ctx.arc(380, 430, 102, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#90a675'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(380, 430, 102, -Math.PI / 2, Math.PI * 1.24); ctx.stroke();
      label('۸۷٪', 429, 448, 48, '#416343', 700);
    } else {
      for (let row = 0; row < 3; row++) line(65, 347 + row * 82, 640, '#e8eadf', 2);
      [96, 128, 107, 174, 151, 224, 203, 258].forEach((height, i) => line(80 + i * 78, 563 - height, 44, i > 5 ? '#ccaa63' : '#9cae86', height));
    }
    label('این هفته', 696, 611, 22, '#7d8b7b');
    label('داده‌های نمایشی', 264, 611, 21, '#7d8b7b');
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
