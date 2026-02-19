// ── State ───────────────────────────────────────────────────────
let config = null;

// ── Initialize ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/config');
    config = await res.json();
    updateModeBadge(config.mode);
    renderProviderReference();
  } catch (e) {
    console.error('Failed to load config:', e);
  }
});

function updateModeBadge(mode) {
  const badge = document.getElementById('modeBadge');
  if (mode === 'hybrid' || mode === 'live') {
    badge.textContent = 'LIVE APIs';
    badge.classList.add('live');
  } else {
    badge.textContent = 'DEMO MODE';
  }
}

// ── Run Pipeline ───────────────────────────────────────────────
async function runPipeline() {
  const btn = document.getElementById('btnRun');
  const resultsSection = document.getElementById('results');
  const stageCards = document.getElementById('stageCards');

  btn.disabled = true;
  btn.textContent = 'Running...';
  btn.classList.add('running');
  resultsSection.style.display = 'block';
  stageCards.innerHTML = '';

  // Reset pipeline steps
  const steps = document.querySelectorAll('.pipeline-step');
  steps.forEach(s => s.classList.remove('active', 'complete', 'error'));

  const sourceLanguage = document.getElementById('sourceLanguage').value;
  const ttsVoice = document.getElementById('ttsVoice').value;

  try {
    // Animate steps sequentially
    const stageNames = ['step-transcribe', 'step-translate', 'step-synthesize', 'step-lipsync', 'step-mix'];

    // Start request
    const fetchPromise = fetch('/api/dub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceLanguage, providers: { voice: ttsVoice } }),
    });

    // Animate pipeline steps while waiting
    for (let i = 0; i < stageNames.length; i++) {
      const step = document.getElementById(stageNames[i]);
      step.classList.add('active');
      await sleep(800);
      step.classList.remove('active');
      step.classList.add('complete');
    }

    const res = await fetchPromise;
    const data = await res.json();

    // Show timing
    document.getElementById('resultsTime').textContent =
      `Completed in ${(data.totalTime / 1000).toFixed(1)}s`;

    // Render stage cards
    renderStageCards(data.stages);
  } catch (err) {
    stageCards.innerHTML = `<div class="note-box" style="border-left-color: var(--red);">Pipeline error: ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run Dubbing Pipeline';
    btn.classList.remove('running');
  }
}

// ── Render Stage Cards ─────────────────────────────────────────
function renderStageCards(stages) {
  const container = document.getElementById('stageCards');
  container.innerHTML = '';

  stages.forEach((stage, i) => {
    const card = document.createElement('div');
    card.className = 'stage-card';
    card.innerHTML = `
      <div class="stage-card-header" onclick="this.parentElement.classList.toggle('open')">
        <div class="stage-number">${i + 1}</div>
        <h3>${stage.name}</h3>
        <span class="stage-provider-tag">${stage.provider}</span>
        <span class="stage-toggle">&#9660;</span>
      </div>
      <div class="stage-card-body">
        ${renderStageBody(stage, i)}
      </div>
    `;
    container.appendChild(card);
  });

  // Auto-open the translation card (most interesting for Assamese)
  const translationCard = container.children[1];
  if (translationCard) translationCard.classList.add('open');
}

function renderStageBody(stage, index) {
  const d = stage.data;

  switch (index) {
    case 0: return renderTranscription(d);
    case 1: return renderTranslation(d);
    case 2: return renderSynthesis(d);
    case 3: return renderLipsync(d);
    case 4: return renderMix(d);
    default: return `<pre>${JSON.stringify(d, null, 2)}</pre>`;
  }
}

function renderTranscription(d) {
  const rows = d.segments.map((s, i) => `
    <tr>
      <td>${s.start.toFixed(1)}s</td>
      <td>${s.end.toFixed(1)}s</td>
      <td>${s.text}</td>
    </tr>
  `).join('');

  return `
    <p style="margin-bottom:12px;color:var(--text-dim);font-size:0.85rem;">
      Detected: <strong>${d.language}</strong> | Duration: ${d.duration}s | Words: ${d.wordCount}
    </p>
    <table class="data-table">
      <thead><tr><th>Start</th><th>End</th><th>Text</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderTranslation(d) {
  const rows = d.segments.map((s, i) => `
    <tr>
      <td>${s.originalText}</td>
      <td class="assamese-text">${s.translatedText}</td>
      <td><span class="timing-badge ${s.charExpansion > 1.5 ? 'over' : s.charExpansion > 1.2 ? 'warn' : 'ok'}">${s.charExpansion}x</span></td>
    </tr>
  `).join('');

  return `
    <p style="margin-bottom:12px;color:var(--text-dim);font-size:0.85rem;">
      ${d.sourceLanguage.toUpperCase()} &rarr; ${d.targetLanguage} (${d.targetCode})
    </p>
    <table class="data-table">
      <thead><tr><th>Source</th><th>Assamese</th><th>Expansion</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="note-box" style="margin-top:12px;">
      <strong>Character expansion</strong> shows how much longer the Assamese text is vs source.
      Values &gt;1.3x may cause timing issues and need speed adjustment or script adaptation.
    </div>
  `;
}

function renderSynthesis(d) {
  const rows = d.segments.map(s => `
    <tr>
      <td class="assamese-text">${s.text}</td>
      <td>${s.estimatedDuration}s</td>
      <td>${s.originalDuration}s</td>
      <td><span class="timing-badge ${s.durationRatio > 1.3 ? 'over' : s.durationRatio > 1.1 ? 'warn' : 'ok'}">${s.durationRatio}x</span></td>
    </tr>
  `).join('');

  let warningsHtml = '';
  if (d.timingWarnings && d.timingWarnings.length > 0) {
    warningsHtml = `
      <ul class="warning-list">
        ${d.timingWarnings.map(w => `<li>${w}</li>`).join('')}
      </ul>
    `;
  }

  return `
    <p style="margin-bottom:12px;color:var(--text-dim);font-size:0.85rem;">
      Voice: <strong>${d.voice}</strong> | Total: ${d.totalDuration.toFixed(1)}s
    </p>
    <table class="data-table">
      <thead><tr><th>Assamese Text</th><th>TTS Duration</th><th>Original</th><th>Ratio</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${warningsHtml}
    <div class="note-box" style="margin-top:12px;">
      <strong>Voice details:</strong> ${d.voiceDetails.type} |
      ${d.voiceDetails.voices.join(', ')} |
      ${d.voiceDetails.features.join(' / ')}
    </div>
  `;
}

function renderLipsync(d) {
  return `
    <p style="margin-bottom:12px;color:var(--text-dim);font-size:0.85rem;">
      Engine: <strong>${d.engine}</strong> | Segments: ${d.segmentsProcessed} | Faces: ${d.facesDetected}
    </p>
    <div style="margin-bottom:12px;">
      ${d.processingNotes.map(n => `<div style="padding:4px 0;font-size:0.85rem;color:var(--text-dim);">&bull; ${n}</div>`).join('')}
    </div>
    <div class="note-box">
      <strong>Quality:</strong> ${d.engineDetails.quality}/10 |
      <strong>Speed:</strong> ${d.engineDetails.speed || 'N/A'} |
      <strong>Requirements:</strong> ${d.engineDetails.requirements}
    </div>
  `;
}

function renderMix(d) {
  const stagesHtml = d.stages.map((s, i) => `
    <div style="margin-bottom:16px;">
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px;">${i + 1}. ${s.name}</div>
      <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:6px;">${s.description}</div>
      ${s.command ? `<code style="display:block;background:var(--surface-2);padding:8px 12px;border-radius:6px;font-size:0.8rem;color:var(--accent);overflow-x:auto;">${s.command}</code>` : ''}
      ${s.parameters ? renderParams(s.parameters) : ''}
    </div>
  `).join('');

  return `
    ${stagesHtml}
    <div class="note-box">
      <strong>Final output:</strong> ${d.finalOutput.file} (${d.finalOutput.duration})
    </div>
  `;
}

function renderParams(params) {
  return `<div style="font-size:0.8rem;color:var(--text-dim);margin-top:4px;">` +
    Object.entries(params).map(([k, v]) => `${k}: <strong>${v}</strong>`).join(' | ') +
    '</div>';
}

// ── Provider Reference ─────────────────────────────────────────
function renderProviderReference() {
  const providers = [
    {
      name: 'Sarvam AI',
      type: 'commercial',
      capabilities: ['STT (Saaras v3)', 'Translation (Sarvam Translate)', 'TTS (Bulbul v3)'],
      assameseSupport: { stt: true, translate: true, tts: 'V2 only (check V3)' },
      languages: '23 (STT/Translate), 11 (TTS)',
      features: 'Indian-first, code-mixed support, 35+ voices, pitch/pace control',
    },
    {
      name: 'AI4Bharat (IIT Madras)',
      type: 'open-source',
      capabilities: ['ASR (IndicWhisper)', 'Translation (IndicTrans2)', 'TTS (Parler-TTS, IndicF5)'],
      assameseSupport: { stt: true, translate: true, tts: true },
      languages: '22+ Indian languages across all models',
      features: 'MIT licensed, voice cloning (IndicF5), expressive TTS (Rasa dataset)',
    },
    {
      name: 'Azure Cognitive Services',
      type: 'commercial',
      capabilities: ['TTS (Yashica)', 'Translation'],
      assameseSupport: { stt: false, translate: true, tts: true },
      languages: '1 Assamese voice (Yashica), translation supported',
      features: 'SSML control, neural voice, production-grade',
    },
    {
      name: 'ElevenLabs',
      type: 'commercial',
      capabilities: ['STT (Scribe)', 'TTS (Multilingual v2)'],
      assameseSupport: { stt: true, translate: false, tts: true },
      languages: '32 TTS languages, 99 STT languages',
      features: 'Voice cloning, emotion control, dubbing studio (29 langs)',
    },
    {
      name: 'OpenAI Whisper',
      type: 'open-source',
      capabilities: ['ASR (large-v3)'],
      assameseSupport: { stt: true, translate: false, tts: false },
      languages: '99 languages',
      features: 'Best general ASR, Assamese WER likely 25-50%',
    },
    {
      name: 'Wav2Lip / Video-Retalking',
      type: 'open-source',
      capabilities: ['Lip Sync'],
      assameseSupport: { lipsync: true },
      languages: 'Language-agnostic (works on audio waveform)',
      features: 'Works for any language, needs GPU',
    },
  ];

  const grid = document.getElementById('refGrid');
  grid.innerHTML = providers.map(p => {
    const supportTags = [];
    if (p.assameseSupport.stt === true) supportTags.push('STT');
    if (p.assameseSupport.translate === true) supportTags.push('Translate');
    if (p.assameseSupport.tts === true) supportTags.push('TTS');
    if (p.assameseSupport.lipsync === true) supportTags.push('Lip Sync');
    const supportStr = supportTags.length > 0
      ? supportTags.map(t => `<span class="has-assamese">${t}</span>`).join('')
      : '<span>Limited</span>';

    return `
      <div class="ref-card">
        <h3>${p.name}</h3>
        <div class="ref-type ${p.type}">${p.type}</div>
        <div class="ref-langs">
          ${supportStr}
        </div>
        <div class="ref-features">
          <div style="margin-bottom:4px;"><strong>Assamese coverage:</strong> ${p.languages}</div>
          <div>${p.features}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Helpers ─────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
