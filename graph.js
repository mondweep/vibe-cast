require("isomorphic-fetch");
const { Client } = require("@microsoft/microsoft-graph-client");

function getGraphClient(accessToken) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

async function getProfile(accessToken) {
  const client = getGraphClient(accessToken);
  return client.api("/me").get();
}

async function getEmails(accessToken, count = 10) {
  const client = getGraphClient(accessToken);
  return client
    .api("/me/messages")
    .top(count)
    .select("subject,from,receivedDateTime,bodyPreview")
    .orderby("receivedDateTime DESC")
    .get();
}

async function getCalendarEvents(accessToken, count = 10) {
  const client = getGraphClient(accessToken);
  return client
    .api("/me/events")
    .top(count)
    .select("subject,start,end,organizer,location")
    .orderby("start/dateTime DESC")
    .get();
}

async function getDriveFiles(accessToken, count = 10) {
  const client = getGraphClient(accessToken);
  return client
    .api("/me/drive/root/children")
    .top(count)
    .select("name,size,lastModifiedDateTime,webUrl")
    .get();
}

async function getContacts(accessToken, count = 10) {
  const client = getGraphClient(accessToken);
  return client
    .api("/me/contacts")
    .top(count)
    .select("displayName,emailAddresses,mobilePhone")
    .get();
}

async function callGraphApi(accessToken, endpoint) {
  const client = getGraphClient(accessToken);
  return client.api(endpoint).get();
}

module.exports = {
  getProfile,
  getEmails,
  getCalendarEvents,
  getDriveFiles,
  getContacts,
  callGraphApi,
};
