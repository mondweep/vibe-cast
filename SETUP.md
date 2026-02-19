# Microsoft Graph Explorer - Setup Guide

Connect to Microsoft Graph API using your `mondweep@finabeo.com` account.

## Step 1: Register an App in Azure AD

1. Go to [Azure Portal](https://portal.azure.com) and sign in with `mondweep@finabeo.com`
2. Navigate to **Microsoft Entra ID** (formerly Azure Active Directory) > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `Vibe Cast Graph Explorer`
   - **Supported account types**: "Accounts in this organizational directory only" (single tenant) — or "Accounts in any organizational directory and personal Microsoft accounts" if you want broader access
   - **Redirect URI**: Select **Web** and enter `http://localhost:3000/auth/callback`
5. Click **Register**

## Step 2: Get Your Credentials

After registration, you'll land on the app's overview page:

1. **Application (client) ID** — copy this → `AZURE_CLIENT_ID`
2. **Directory (tenant) ID** — copy this → `AZURE_TENANT_ID`
3. Go to **Certificates & secrets** > **New client secret**
   - Description: `dev-secret`
   - Expiry: 6 months (or your preference)
   - Copy the **Value** (not the Secret ID) → `AZURE_CLIENT_SECRET`

## Step 3: Configure API Permissions

1. Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**
2. Add these permissions:
   - `User.Read` (usually already added)
   - `Mail.Read`
   - `Calendars.Read`
   - `Files.Read`
   - `Contacts.Read`
3. Click **Grant admin consent** if you have admin rights (otherwise ask your tenant admin)

## Step 4: Configure and Run

```bash
# Copy the env template
cp .env.example .env

# Edit .env with your credentials from Step 2
# Fill in AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET

# Start the server
npm start
```

Open http://localhost:3000 and click **Sign in with Microsoft**.

## Available Graph Endpoints

Once authenticated, you can explore these via the web UI or API:

| Endpoint | Description |
|----------|-------------|
| `/me` | Your profile |
| `/me/messages` | Emails |
| `/me/events` | Calendar events |
| `/me/drive/root/children` | OneDrive files |
| `/me/contacts` | Contacts |
| `/me/memberOf` | Groups and directory roles |
| `/me/mailFolders` | Mail folders |

You can also type any Graph API endpoint into the query box.
