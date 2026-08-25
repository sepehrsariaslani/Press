const jalaliFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const jalaliYearFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
});

export function formatJalali(input) {
  const date = input instanceof Date ? input : new Date(input);
  return jalaliFormatter.format(date);
}

export function faDigitsToEn(value) {
  if (!value) return '';
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return value
    .split('')
    .map((ch) => {
      const index = fa.indexOf(ch);
      return index >= 0 ? String(index) : ch;
    })
    .join('');
}

export function enDigitsToFa(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function currentJalaliYear() {
  const formatted = jalaliYearFormatter.format(new Date());
  return Number(faDigitsToEn(formatted));
}
