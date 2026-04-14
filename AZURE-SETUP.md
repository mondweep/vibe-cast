# Azure Foundry Setup - Quick Start

## Prerequisites

- Azure account with Finabeo subscription access (<your-azure-email>)
- PowerShell 7+ installed
- Azure CLI installed (`az --version` to check)

## Setup Steps (5 minutes)

### 1. Install Azure CLI (if needed)

**Windows (PowerShell)**:
```powershell
# Using PowerShell
$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile AzureCLI.msi; & '.\AzureCLI.msi' /quiet
```

**Mac**:
```bash
brew install azure-cli
```

**Linux**:
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 2. Authenticate to Azure

```powershell
# Open PowerShell and run:
az login --use-device-code

# You'll see:
# To sign in, use a web browser to open the page https://microsoft.com/devicelogin
# and enter the code XXXXXXXXX to authenticate.

# 1. Go to that URL in your browser
# 2. Enter the code
# 3. Sign in with <your-azure-email>
# 4. Come back to PowerShell (it will auto-continue)
```

### 3. Deploy Foundry Infrastructure

```powershell
# Navigate to the vibe-cast directory
cd path/to/vibe-cast

# Run deployment script
# Default: eastus region, <resource-group> resource group
.\infra\deploy-foundry.ps1

# Or customize:
.\infra\deploy-foundry.ps1 `
  -ResourceGroupName "my-resource-group" `
  -Location "westeurope" `
  -ProjectName "finabeo-marketing-ai"
```

### 4. Get Connection Details

The script will output something like:

```
╔════════════════════════════════════════════════════════════╗
║          ✓ FOUNDRY DEPLOYMENT SUCCESSFUL                  ║
╚════════════════════════════════════════════════════════════╝

Connection Details:
  Endpoint:           https://ai-foundry-xxxx.services.ai.azure.com/
  Project Name:       <foundry-project>
  Resource Group:     <resource-group>
  Subscription ID:    xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 5. Generate API Key

In Azure Portal:
1. Go to your resource group (<resource-group>)
2. Find the AI Hub resource
3. Go to Settings → API Keys
4. Copy one of the keys (or create new)

### 6. Share Details With Me

Send me:
- ✅ **Endpoint**: https://ai-foundry-xxxx.services.ai.azure.com/
- ✅ **Project Name**: <foundry-project>
- ✅ **API Key**: (paste here)

Keep private:
- 🔐 Your Azure credentials
- 🔐 Subscription details beyond what's listed

---

## Troubleshooting

### "az: command not found"
Azure CLI not installed. See "Install Azure CLI" above.

### "Authentication failed"
1. Make sure you're using correct account: <your-azure-email>
2. Try: `az logout` then `az login --use-device-code` again

### "Permission denied"
Your account may not have permissions in this subscription. 
- Check with Azure subscription admin
- Verify you're in the right subscription: `az account list`

### "Resource group already exists"
That's fine! The script will reuse it.

---

## What Gets Created

The deployment creates:
- ✅ Azure Resource Group
- ✅ AI Hub (unified AI service)
- ✅ AI Project (your agents project)
- ✅ Key Vault (for secrets)
- ✅ Application Insights (for monitoring)
- ✅ Storage Account (for outputs)

**Estimated Cost**: ~$10-30/month for exploration (pay-per-token)

---

## Once You Have Connection Details

1. Tell me your Endpoint and Project Name
2. I'll create `appsettings.json` for C# agents
3. We start building agents immediately
4. You'll be generating marketing content by Wednesday

**Total setup time: 5 minutes**
**Time to first agent: +1 hour**

---

## Support

If anything goes wrong, just let me know:
- Error message you see
- Which step you're on
- I'll adjust and help you through it

Let's go! 🚀
