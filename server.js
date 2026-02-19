require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { getAuthUrl, getTokenFromCode } = require("./auth");
const graph = require("./graph");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  session({
    secret: process.env.SESSION_SECRET || "microsoft-graph-explorer-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(express.json());

// Home page
app.get("/", (req, res) => {
  const user = req.session.user;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Microsoft Graph Explorer - Vibe Cast</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #f5f5f5; }
        h1 { color: #0078d4; }
        .card { background: white; border-radius: 8px; padding: 24px; margin: 16px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 12px 24px; background: #0078d4; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; border: none; cursor: pointer; }
        .btn:hover { background: #106ebe; }
        .btn-danger { background: #d13438; }
        .btn-secondary { background: #6c757d; margin: 4px; }
        pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }
        .user-info { display: flex; align-items: center; gap: 16px; }
        .endpoints { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
        #result { margin-top: 16px; }
        .custom-query { display: flex; gap: 8px; margin: 16px 0; }
        .custom-query input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
      </style>
    </head>
    <body>
      <h1>Microsoft Graph Explorer</h1>
      ${
        user
          ? `
        <div class="card">
          <div class="user-info">
            <div>
              <h2>Welcome, ${user.name}</h2>
              <p>${user.username}</p>
            </div>
            <a href="/auth/logout" class="btn btn-danger">Sign Out</a>
          </div>
        </div>
        <div class="card">
          <h3>Explore Microsoft Graph</h3>
          <div class="endpoints">
            <button class="btn btn-secondary" onclick="query('/me')">My Profile</button>
            <button class="btn btn-secondary" onclick="query('/me/messages?$top=5')">Emails</button>
            <button class="btn btn-secondary" onclick="query('/me/events?$top=5')">Calendar</button>
            <button class="btn btn-secondary" onclick="query('/me/drive/root/children')">OneDrive Files</button>
            <button class="btn btn-secondary" onclick="query('/me/contacts')">Contacts</button>
            <button class="btn btn-secondary" onclick="query('/me/memberOf')">Groups</button>
            <button class="btn btn-secondary" onclick="query('/me/photo/$value')">Photo</button>
          </div>
          <div class="custom-query">
            <input type="text" id="endpoint" placeholder="Enter Graph API endpoint, e.g. /me/mailFolders" value="/me" />
            <button class="btn" onclick="query(document.getElementById('endpoint').value)">Query</button>
          </div>
          <div id="result"></div>
        </div>
        <script>
          async function query(endpoint) {
            document.getElementById('endpoint').value = endpoint;
            document.getElementById('result').innerHTML = '<p>Loading...</p>';
            try {
              const res = await fetch('/api/graph?endpoint=' + encodeURIComponent(endpoint));
              const data = await res.json();
              document.getElementById('result').innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (err) {
              document.getElementById('result').innerHTML = '<pre style="color:#f48771;">Error: ' + err.message + '</pre>';
            }
          }
        </script>
      `
          : `
        <div class="card">
          <h2>Connect your Microsoft Account</h2>
          <p>Sign in with your Microsoft account to explore the Graph API.</p>
          <p>Account: <strong>mondweep@finabeo.com</strong></p>
          <br/>
          <a href="/auth/login" class="btn">Sign in with Microsoft</a>
        </div>
      `
      }
    </body>
    </html>
  `);
});

// Start OAuth login
app.get("/auth/login", async (req, res) => {
  try {
    const authUrl = await getAuthUrl();
    res.redirect(authUrl);
  } catch (err) {
    console.error("Auth URL error:", err);
    res.status(500).send("Error starting authentication: " + err.message);
  }
});

// OAuth callback
app.get("/auth/callback", async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`Auth error: ${error} - ${error_description}`);
  }

  if (!code) {
    return res.status(400).send("No authorization code received");
  }

  try {
    const tokenResponse = await getTokenFromCode(code);

    req.session.accessToken = tokenResponse.accessToken;
    req.session.account = tokenResponse.account;
    req.session.user = {
      name: tokenResponse.account.name,
      username: tokenResponse.account.username,
    };

    console.log(`Authenticated: ${tokenResponse.account.username}`);
    res.redirect("/");
  } catch (err) {
    console.error("Token error:", err);
    res.status(500).send("Error completing authentication: " + err.message);
  }
});

// Logout
app.get("/auth/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Generic Graph API proxy
app.get("/api/graph", async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const endpoint = req.query.endpoint || "/me";
  try {
    const result = await graph.callGraphApi(req.session.accessToken, endpoint);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      code: err.code,
    });
  }
});

// Pre-built endpoints for convenience
app.get("/api/profile", async (req, res) => {
  if (!req.session.accessToken) return res.status(401).json({ error: "Not authenticated" });
  try {
    res.json(await graph.getProfile(req.session.accessToken));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/emails", async (req, res) => {
  if (!req.session.accessToken) return res.status(401).json({ error: "Not authenticated" });
  try {
    res.json(await graph.getEmails(req.session.accessToken, parseInt(req.query.count) || 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/calendar", async (req, res) => {
  if (!req.session.accessToken) return res.status(401).json({ error: "Not authenticated" });
  try {
    res.json(await graph.getCalendarEvents(req.session.accessToken, parseInt(req.query.count) || 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/files", async (req, res) => {
  if (!req.session.accessToken) return res.status(401).json({ error: "Not authenticated" });
  try {
    res.json(await graph.getDriveFiles(req.session.accessToken, parseInt(req.query.count) || 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\nMicrosoft Graph Explorer running at http://localhost:${PORT}`);
  console.log(`Sign in with your Microsoft account to get started.\n`);
});
