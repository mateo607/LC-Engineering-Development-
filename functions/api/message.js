const GHL_LOCATION_ID = 'bp4lwvcT0gLJp32JbndW';
const GHL_CONTACTS_URL = 'https://services.leadconnectorhq.com/contacts/';
const GHL_NOTES_URL    = 'https://services.leadconnectorhq.com/contacts/{contactId}/notes';

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

// Handle contact form submission
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

  if (!body.first_name || !body.last_name || !body.email || !body.message) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  // Step 1 — Create / update the contact
  const contactPayload = {
    locationId: GHL_LOCATION_ID,
    firstName:  body.first_name,
    lastName:   body.last_name,
    email:      body.email,
    phone:      body.phone   || '',
    tags:       ['Inbound', 'Website-Contact'],
    source:     body.source  || 'LC Engineering Website — Contact Form',
    customFields: [
      { key: 'role', field_value: body.role || '' }
    ]
  };

  const contactRes = await fetch(GHL_CONTACTS_URL, {
    method: 'POST',
    headers: authHeaders(GHL_API_TOKEN),
    body: JSON.stringify(contactPayload)
  });

  const contactData = await contactRes.json().catch(() => ({}));

  if (!contactRes.ok) {
    return jsonResponse(contactData, contactRes.status);
  }

  const contactId = contactData.contact?.id;

  // Step 2 — Add the message as a note on the contact
  if (contactId && body.message) {
    const noteBody = [
      `Message from website contact form:`,
      ``,
      body.message,
      ``,
      `Role: ${body.role || 'Not specified'}`,
      `Source: ${body.source || 'LC Engineering Website — Contact Form'}`
    ].join('\n');

    await fetch(GHL_NOTES_URL.replace('{contactId}', contactId), {
      method: 'POST',
      headers: authHeaders(GHL_API_TOKEN),
      body: JSON.stringify({ body: noteBody, userId: '' })
    });
  }

  return jsonResponse(contactData, 201);
}

// ── helpers ──────────────────────────────────────────────
function authHeaders(token) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
    'Version':       '2021-07-28'
  };
}

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
