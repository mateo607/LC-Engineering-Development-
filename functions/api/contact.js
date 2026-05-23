const GHL_LOCATION_ID = 'bp4lwvcT0gLJp32JbndW';
const GHL_API_URL = 'https://services.leadconnectorhq.com/contacts/';

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

// Handle form submission
export async function onRequestPost(context) {
  const GHL_API_TOKEN = context.env.GHL_API_TOKEN;

  if (!GHL_API_TOKEN) {
    return jsonResponse({ error: 'Server misconfiguration: missing API token' }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  // Validate required fields
  if (!body.first_name || !body.last_name || !body.email) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  // Map form fields to GHL Contacts API format
  const payload = {
    locationId:  GHL_LOCATION_ID,
    firstName:   body.first_name,
    lastName:    body.last_name,
    email:       body.email,
    phone:       body.phone        || '',
    address1:    body.address      || '',
    city:        body.city         || '',
    state:       body.state        || '',
    postalCode:  body.postal_code  || '',
    tags:        ['Inbound', 'Website-Form'],
    source:      body.source       || 'LC Engineering Website — Submit a Parcel',
    customFields: [
      { key: 'lot_size', field_value: body.lot_size || '' }
    ]
  };

  const ghlRes = await fetch(GHL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GHL_API_TOKEN}`,
      'Version':       '2021-07-28'
    },
    body: JSON.stringify(payload)
  });

  const data = await ghlRes.json().catch(() => ({}));

  return jsonResponse(data, ghlRes.status);
}

// ── helpers ──────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}
