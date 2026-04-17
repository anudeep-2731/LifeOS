/**
 * Gmail API Service
 * Handles OAuth2 authentication and fetching bank alerts for Smart Import.
 */

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

let tokenClient;
let gapiInited = false;
let gsiInited = false;

// Initialize GAPI
export async function initGmail(clientId) {
  if (gapiInited && gsiInited) return;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      gapi.load('client', async () => {
        await gapi.client.init({
          clientId: clientId,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: '', // defined at request time
        });
        gsiInited = true;
        resolve();
      });
    };
    document.body.appendChild(script);
  });
}

/**
 * Authenticate and return the access token
 */
export async function authenticate() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        reject(resp);
      }
      resolve(gapi.client.getToken());
    };

    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

/**
 * Fetch recent messages that look like bank alerts for the current month.
 */
export async function fetchBankEmails(maxResults = 50) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/01`;

  // Search query for common banking keywords for the current month
  const query = `after:${monthStart} (debited OR "spent on" OR "transaction" OR "debit alert" OR "statement")`;
  
  const response = await gapi.client.gmail.users.messages.list({
    'userId': 'me',
    'q': query,
    'maxResults': maxResults
  });

  const messages = response.result.messages || [];
  const results = [];

  for (const msg of messages) {
    const detail = await gapi.client.gmail.users.messages.get({
      'userId': 'me',
      'id': msg.id,
      'format': 'full'
    });
    
    const payload = detail.result.payload;
    const headers = payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const snippet = detail.result.snippet || '';
    const internalDateMs = Number(detail.result.internalDate);
    
    // Format date from email's internalDate (epoch ms)
    const idate = new Date(internalDateMs);
    const internalDate = `${idate.getFullYear()}-${String(idate.getMonth() + 1).padStart(2, '0')}-${String(idate.getDate()).padStart(2, '0')}`;

    // Try to extract plain text body for richer parsing
    let fullBody = snippet;
    try {
      const getBody = (part) => {
        if (!part) return '';
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        if (part.parts) {
          for (const p of part.parts) {
            const txt = getBody(p);
            if (txt) return txt;
          }
        }
        return '';
      };
      const decoded = getBody(payload);
      if (decoded) fullBody = decoded.trim().substring(0, 500); // cap at 500 chars
    } catch (_) { /* fallback to snippet */ }

    results.push({
      id: msg.id,
      subject,
      snippet,
      fullBody,
      internalDate,
    });
  }

  return results;
}
