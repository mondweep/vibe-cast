/**
 * Translation Stage
 *
 * Integrates with:
 *   - AI4Bharat IndicTrans2 (open source, best for Indian languages)
 *   - Azure Translator (commercial, supports Assamese)
 *   - Google Translate API (commercial)
 *
 * For the demo: provides pre-translated Assamese output.
 */

const SAMPLE_TRANSLATIONS = {
  en: [
    { original: 'Welcome to this demonstration of our new product.', assamese: 'আমাৰ নতুন সামগ্ৰীৰ এই প্ৰদৰ্শনলৈ আপোনাক স্বাগতম।' },
    { original: 'Today we will show you how artificial intelligence can bridge language barriers.', assamese: 'আজি আমি আপোনাক দেখুৱাম যে কৃত্ৰিম বুদ্ধিমত্তাই কেনেকৈ ভাষাৰ বাধা দূৰ কৰিব পাৰে।' },
    { original: 'Our goal is to make technology accessible to everyone, regardless of the language they speak.', assamese: 'আমাৰ লক্ষ্য হৈছে প্ৰযুক্তিবিদ্যা সকলোৰে বাবে সুলভ কৰা, তেওঁলোকে কোনো ভাষাতেই কথা কওক।' },
    { original: 'Let us begin with a simple example of how this works.', assamese: 'এইটো কেনেকৈ কাম কৰে তাৰ এটা সৰল উদাহৰণেৰে আৰম্ভ কৰোঁ আহক।' },
    { original: 'The system listens, understands, translates, and speaks — all in real time.', assamese: 'চিষ্টেমে শুনে, বুজে, অনুবাদ কৰে, আৰু কয় — সকলো ৰিয়েল টাইমত।' },
  ],
  hi: [
    { original: 'हमारे नए उत्पाद के इस प्रदर्शन में आपका स्वागत है।', assamese: 'আমাৰ নতুন সামগ্ৰীৰ এই প্ৰদৰ্শনলৈ আপোনাক স্বাগতম।' },
    { original: 'आज हम आपको दिखाएंगे कि कृत्रिम बुद्धिमत्ता भाषा की बाधाओं को कैसे पार कर सकती है।', assamese: 'আজি আমি আপোনাক দেখুৱাম যে কৃত্ৰিম বুদ্ধিমত্তাই কেনেকৈ ভাষাৰ বাধা দূৰ কৰিব পাৰে।' },
    { original: 'हमारा लक्ष्य प्रौद्योगिकी को सभी के लिए सुलभ बनाना है।', assamese: 'আমাৰ লক্ষ্য হৈছে প্ৰযুক্তিবিদ্যা সকলোৰে বাবে সুলভ কৰা।' },
    { original: 'आइए एक सरल उदाहरण से शुरू करते हैं।', assamese: 'এটা সৰল উদাহৰণেৰে আৰম্ভ কৰোঁ আহক।' },
    { original: 'सिस्टम सुनता है, समझता है, अनुवाद करता है, और बोलता है।', assamese: 'চিষ্টেমে শুনে, বুজে, অনুবাদ কৰে, আৰু কয়।' },
  ],
};

async function translate(segments, options = {}) {
  const { apiKey, provider = 'demo', sourceLanguage = 'en' } = options;

  if (provider === 'indictrans2' && options.endpoint) {
    return await translateWithIndicTrans2(segments, options.endpoint);
  }
  if (provider === 'azure' && apiKey) {
    return await translateWithAzure(segments, apiKey);
  }

  // Demo mode
  await simulateProcessing(1800);

  const samples = SAMPLE_TRANSLATIONS[sourceLanguage] || SAMPLE_TRANSLATIONS.en;
  return {
    provider: 'demo',
    sourceLanguage,
    targetLanguage: 'Assamese (অসমীয়া)',
    targetCode: 'as',
    segments: segments.map((seg, i) => ({
      ...seg,
      originalText: seg.text,
      translatedText: samples[i]?.assamese || seg.text,
      charExpansion: samples[i] ? (samples[i].assamese.length / seg.text.length).toFixed(2) : '1.00',
    })),
  };
}

async function translateWithIndicTrans2(segments, endpoint) {
  // AI4Bharat IndicTrans2 — best open-source option for Indian languages
  // Deploy: https://github.com/AI4Bharat/IndicTrans2
  // Also available via Bhashini API: https://bhashini.gov.in/ulca/model/explore-models
  throw new Error(
    'IndicTrans2 requires a running server.\n' +
    'Option 1: Self-host from https://github.com/AI4Bharat/IndicTrans2\n' +
    'Option 2: Use Bhashini API (free for Indian languages)\n' +
    'Set INDICTRANS2_ENDPOINT in your environment.'
  );
}

async function translateWithAzure(segments, apiKey) {
  // Azure Translator supports Assamese (language code: as)
  // POST to https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=as
  throw new Error(
    'Azure Translator integration requires:\n' +
    'Set AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION.\n' +
    'Assamese language code: "as"'
  );
}

function simulateProcessing(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { translate };
