/**
 * SCORM Package Builder
 * Creates SCORM-compliant packages
 */

import { EnrichedContent } from '../types/EnrichedContent';
import { InteractiveContent } from '../types/InteractiveContent';
import { VideoContent } from '../types/VideoContent';
import { SCORMConfig, SCORMManifest } from '../types/SCORMPackage';
import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';

export class SCORMPackageBuilder {
  private config: SCORMConfig;

  constructor(config: SCORMConfig) {
    this.config = config;
  }

  /**
   * Build SCORM package from enriched content
   */
  async build(
    enrichedContent: EnrichedContent,
    interactiveContent: InteractiveContent,
    videoContent?: VideoContent,
    outputPath?: string
  ): Promise<string> {
    console.log('Building SCORM package...');

    // Create manifest
    const manifest = this.createManifest(enrichedContent, interactiveContent);

    // Create player HTML
    const playerHTML = this.createPlayerHTML(enrichedContent, interactiveContent);

    // Create SCORM API wrapper
    const scormAPI = this.createSCORMAPI();

    // Package files
    const packagePath = outputPath || path.join(process.cwd(), 'output', 'scorm-package.zip');
    await this.packageFiles(manifest, playerHTML, scormAPI, packagePath, enrichedContent, interactiveContent, videoContent);

    console.log(`SCORM package created: ${packagePath}`);
    return packagePath;
  }

  private createManifest(
    enrichedContent: EnrichedContent,
    interactiveContent: InteractiveContent
  ): SCORMManifest {
    const identifier = `course-${Date.now()}`;
    const version = this.config.version === '1.2' ? 'SCORM 1.2' : 'SCORM 2004 4th Edition';

    return {
      identifier,
      version: '1.0',
      metadata: {
        schema: 'ADL SCORM',
        schemaversion: this.config.version,
        title: enrichedContent.metadata.title,
        description: enrichedContent.metadata.description,
      },
      organizations: [
        {
          identifier: 'default-org',
          title: enrichedContent.metadata.title,
          items: interactiveContent.modules.map((module, index) => ({
            identifier: `item-${index + 1}`,
            title: module.title,
            type: 'sco',
            href: `content/module-${index + 1}.html`,
            masteryScore: this.config.masteryScore,
          })),
        },
      ],
      resources: interactiveContent.modules.map((module, index) => ({
        identifier: `resource-${index + 1}`,
        type: 'webcontent',
        href: `content/module-${index + 1}.html`,
        files: [
          `content/module-${index + 1}.html`,
          'js/scorm-api.js',
          'js/player.js',
          'css/styles.css',
        ],
      })),
    };
  }

  private createManifestXML(manifest: SCORMManifest): string {
    const xmlns = this.config.version === '1.2'
      ? 'http://www.imsproject.org/xsd/imscp_rootv1p1p2'
      : 'http://www.imsglobal.org/xsd/imscp_v1p1';

    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifest.identifier}" version="${manifest.version}"
          xmlns="${xmlns}"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
          xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
          xmlns:imsss="http://www.imsglobal.org/xsd/imsss">
  <metadata>
    <schema>${manifest.metadata.schema}</schema>
    <schemaversion>${manifest.metadata.schemaversion}</schemaversion>
    <adlcp:location>metadata.xml</adlcp:location>
  </metadata>
  <organizations default="${manifest.organizations[0].identifier}">
    <organization identifier="${manifest.organizations[0].identifier}">
      <title>${this.escapeXML(manifest.organizations[0].title)}</title>
      ${manifest.organizations[0].items.map(item => `
      <item identifier="${item.identifier}" identifierref="${item.identifier}-resource">
        <title>${this.escapeXML(item.title)}</title>
        <adlcp:masteryscore>${item.masteryScore}</adlcp:masteryscore>
      </item>`).join('')}
    </organization>
  </organizations>
  <resources>
    ${manifest.resources.map(resource => `
    <resource identifier="${resource.identifier}-resource" type="${resource.type}" adlcp:scormtype="sco" href="${resource.href}">
      ${resource.files.map(file => `<file href="${file}"/>`).join('\n      ')}
    </resource>`).join('')}
  </resources>
</manifest>`;
  }

  private createPlayerHTML(
    enrichedContent: EnrichedContent,
    interactiveContent: InteractiveContent
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${enrichedContent.metadata.title}</title>
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
  <div id="scorm-player">
    <header>
      <h1>${enrichedContent.metadata.title}</h1>
      <div id="progress-bar"></div>
    </header>

    <main id="content-area">
      <!-- Content will be loaded here dynamically -->
    </main>

    <footer>
      <button id="prev-btn" onclick="navigatePrevious()">Previous</button>
      <button id="next-btn" onclick="navigateNext()">Next</button>
      <button id="exit-btn" onclick="exitCourse()">Exit</button>
    </footer>
  </div>

  <script src="../js/scorm-api.js"></script>
  <script src="../js/player.js"></script>
  <script>
    const courseData = ${JSON.stringify(enrichedContent)};
    const interactiveData = ${JSON.stringify(interactiveContent)};

    // Initialize SCORM
    initializeSCORM();

    // Load content
    loadContent();
  </script>
</body>
</html>`;
  }

  private createSCORMAPI(): string {
    if (this.config.version === '1.2') {
      return this.createSCORM12API();
    } else {
      return this.createSCORM2004API();
    }
  }

  private createSCORM12API(): string {
    return `
/**
 * SCORM 1.2 API Wrapper
 */

var API = null;

function initializeSCORM() {
  API = getAPI();
  if (API) {
    API.LMSInitialize("");
    API.LMSSetValue("cmi.core.lesson_status", "incomplete");
    API.LMSCommit("");
  }
}

function getAPI() {
  var theAPI = findAPI(window);
  if (!theAPI && window.opener) {
    theAPI = findAPI(window.opener);
  }
  return theAPI;
}

function findAPI(win) {
  var findAttempts = 0;
  while (win.API == null && win.parent != null && win.parent != win) {
    findAttempts++;
    if (findAttempts > 7) return null;
    win = win.parent;
  }
  return win.API;
}

function setComplete() {
  if (API) {
    API.LMSSetValue("cmi.core.lesson_status", "completed");
    API.LMSCommit("");
  }
}

function setScore(score) {
  if (API) {
    API.LMSSetValue("cmi.core.score.raw", score.toString());
    API.LMSSetValue("cmi.core.score.min", "0");
    API.LMSSetValue("cmi.core.score.max", "100");
    API.LMSCommit("");
  }
}

function exitCourse() {
  if (API) {
    API.LMSFinish("");
  }
  window.close();
}

function saveProgress(location) {
  if (API) {
    API.LMSSetValue("cmi.core.lesson_location", location);
    API.LMSCommit("");
  }
}`;
  }

  private createSCORM2004API(): string {
    return `
/**
 * SCORM 2004 API Wrapper
 */

var API_1484_11 = null;

function initializeSCORM() {
  API_1484_11 = getAPI();
  if (API_1484_11) {
    API_1484_11.Initialize("");
    API_1484_11.SetValue("cmi.completion_status", "incomplete");
    API_1484_11.Commit("");
  }
}

function getAPI() {
  var theAPI = findAPI(window);
  if (!theAPI && window.opener) {
    theAPI = findAPI(window.opener);
  }
  return theAPI;
}

function findAPI(win) {
  var findAttempts = 0;
  while (win.API_1484_11 == null && win.parent != null && win.parent != win) {
    findAttempts++;
    if (findAttempts > 7) return null;
    win = win.parent;
  }
  return win.API_1484_11;
}

function setComplete() {
  if (API_1484_11) {
    API_1484_11.SetValue("cmi.completion_status", "completed");
    API_1484_11.SetValue("cmi.success_status", "passed");
    API_1484_11.Commit("");
  }
}

function setScore(score) {
  if (API_1484_11) {
    API_1484_11.SetValue("cmi.score.raw", score.toString());
    API_1484_11.SetValue("cmi.score.min", "0");
    API_1484_11.SetValue("cmi.score.max", "100");
    API_1484_11.SetValue("cmi.score.scaled", (score / 100).toString());
    API_1484_11.Commit("");
  }
}

function exitCourse() {
  if (API_1484_11) {
    API_1484_11.Terminate("");
  }
  window.close();
}

function saveProgress(location) {
  if (API_1484_11) {
    API_1484_11.SetValue("cmi.location", location);
    API_1484_11.Commit("");
  }
}`;
  }

  private async packageFiles(
    manifest: SCORMManifest,
    playerHTML: string,
    scormAPI: string,
    outputPath: string,
    enrichedContent: EnrichedContent,
    interactiveContent: InteractiveContent,
    videoContent?: VideoContent
  ): Promise<void> {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // Add manifest
    archive.append(this.createManifestXML(manifest), { name: 'imsmanifest.xml' });

    // Add SCORM API
    archive.append(scormAPI, { name: 'js/scorm-api.js' });

    // Add player files
    archive.append(this.createPlayerJS(), { name: 'js/player.js' });
    archive.append(this.createStylesCSS(), { name: 'css/styles.css' });

    // Add module HTML files
    for (let i = 0; i < interactiveContent.modules.length; i++) {
      const module = interactiveContent.modules[i];
      const moduleHTML = this.createModuleHTML(module, enrichedContent.units[i]);
      archive.append(moduleHTML, { name: `content/module-${i + 1}.html` });
    }

    await archive.finalize();

    return new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      archive.on('error', (err: Error) => reject(err));
    });
  }

  private createPlayerJS(): string {
    return `
function loadContent() {
  const currentModule = 0;
  displayModule(currentModule);
}

function displayModule(index) {
  const module = interactiveData.modules[index];
  const unit = courseData.units[index];

  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = \`
    <h2>\${unit.title}</h2>
    <div class="summary">\${unit.summary}</div>
    <div class="content">\${unit.text}</div>
    <div class="key-points">
      <h3>Key Points</h3>
      <ul>
        \${unit.keyPoints.map(point => \`<li>\${point}</li>\`).join('')}
      </ul>
    </div>
  \`;

  saveProgress(index.toString());
}

function navigateNext() {
  // Implementation for next navigation
}

function navigatePrevious() {
  // Implementation for previous navigation
}`;
  }

  private createStylesCSS(): string {
    return `
body {
  font-family: 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

#scorm-player {
  max-width: 1200px;
  margin: 0 auto;
  background-color: white;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

header {
  background-color: #0066cc;
  color: white;
  padding: 20px;
}

header h1 {
  margin: 0;
  font-size: 24px;
}

main {
  padding: 30px;
  min-height: 400px;
}

footer {
  padding: 20px;
  background-color: #f0f0f0;
  text-align: center;
}

button {
  padding: 10px 20px;
  margin: 0 5px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0052a3;
}

.key-points {
  background-color: #f9f9f9;
  padding: 15px;
  border-left: 4px solid #0066cc;
  margin-top: 20px;
}`;
  }

  private createModuleHTML(module: any, unit: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${module.title}</title>
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
  <div id="scorm-player">
    <header>
      <h1>${module.title}</h1>
    </header>

    <main>
      <h2>${unit.title}</h2>
      <div class="summary">${unit.summary}</div>
      <div class="content">${unit.text}</div>

      <div class="key-points">
        <h3>Key Points</h3>
        <ul>
          ${unit.keyPoints.map((point: string) => `<li>${point}</li>`).join('')}
        </ul>
      </div>
    </main>

    <footer>
      <button onclick="setComplete()">Mark Complete</button>
    </footer>
  </div>

  <script src="../js/scorm-api.js"></script>
  <script>
    initializeSCORM();
  </script>
</body>
</html>`;
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
