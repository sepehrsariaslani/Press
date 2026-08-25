function normalizeString(value) {
  return (value || '').toString().trim();
}

function getUtmParams() {
  const query = new URLSearchParams(window.location.search);
  return {
    utm_source: normalizeString(query.get('utm_source')),
    utm_medium: normalizeString(query.get('utm_medium')),
    utm_campaign: normalizeString(query.get('utm_campaign')),
  };
}

export async function submitErpyarLead(payload) {
  const body = new URLSearchParams({
    ...payload,
    ...getUtmParams(),
  });

  const response = await fetch('/api/method/press.api.erpyar.submit_lead', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body,
    credentials: 'same-origin',
  });

  const json = await response.json().catch(() => ({}));
  const data = json?.message || json;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || 'ارسال فرم انجام نشد. لطفا دوباره تلاش کنید.');
  }

  return data;
}
