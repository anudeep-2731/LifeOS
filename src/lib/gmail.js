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
 * Fetch recent threads that look like bank alerts
 */
export async function fetchBankEmails(days = 7) {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  const after = dateLimit.toISOString().split('T')[0].replace(/-/g, '/');

  // Search query for common banking keywords
  const query = `after:${after} (debited OR "spent on" OR "transaction at" OR "alert" OR "statement")`;
  
  const response = await gapi.client.gmail.users.messages.list({
    'userId': 'me',
    'q': query,
    'maxResults': 20
  });

  const messages = response.result.messages || [];
  const results = [];

  for (const msg of messages) {
    const detail = await gapi.client.gmail.users.messages.get({
      'userId': 'me',
      'id': msg.id
    });
    
    // Extract snippet and subject
    const payload = detail.result.payload;
    const headers = payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const body = detail.result.snippet || '';
    
    results.push({
      id: msg.id,
      subject,
      snippet: body,
      date: new Date(parseInt(detail.result.internalDate)).toLocaleString()
    });
  }

  return results;
}
