const msal = require("@azure/msal-node");

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
};

const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3000/auth/callback";

const SCOPES = [
  "User.Read",
  "Mail.Read",
  "Calendars.Read",
  "Files.Read",
  "Contacts.Read",
];

const msalClient = new msal.ConfidentialClientApplication(msalConfig);

async function getAuthUrl() {
  return msalClient.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
  });
}

async function getTokenFromCode(code) {
  const tokenResponse = await msalClient.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
  });
  return tokenResponse;
}

async function getTokenSilently(accountInfo) {
  const tokenResponse = await msalClient.acquireTokenSilent({
    scopes: SCOPES,
    account: accountInfo,
  });
  return tokenResponse;
}

module.exports = { getAuthUrl, getTokenFromCode, getTokenSilently, msalClient };
