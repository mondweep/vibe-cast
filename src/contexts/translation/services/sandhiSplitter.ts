import type { WordBreakdown } from '../../../shared/types/database.types'

// Sanskrit sandhi splitting rules (simplified for MVP)
// Full implementation would use sanskrit_parser or Vidyut library via API

const COMMON_SPLITS: Record<string, WordBreakdown[]> = {
  // Common sandhi examples for testing
  'नमस्ते': [
    { devanagari: 'नमः', iast: 'namaḥ', meaning: 'salutation', root_dhatu: 'नम्', grammar: 'noun, nominative' },
    { devanagari: 'ते', iast: 'te', meaning: 'to you', grammar: 'pronoun, dative' },
  ],
}

export function splitSandhi(devanagari: string): WordBreakdown[] {
  // Check known splits first
  if (COMMON_SPLITS[devanagari]) {
    return COMMON_SPLITS[devanagari]
  }

  // For unknown words, return as single unit
  // In production, this calls the Sanskrit NLP API
  return [{
    devanagari,
    iast: devanagariToIAST(devanagari),
    meaning: '',
  }]
}

// Simplified Devanagari to IAST transliteration
// Production version would use a proper transliteration library
export function devanagariToIAST(text: string): string {
  const map: Record<string, string> = {
    'अ': 'a', 'आ': 'ā', 'इ': 'i', 'ई': 'ī', 'उ': 'u', 'ऊ': 'ū',
    'ऋ': 'ṛ', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'ṅa',
    'च': 'ca', 'छ': 'cha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'ña',
    'ट': 'ṭa', 'ठ': 'ṭha', 'ड': 'ḍa', 'ढ': 'ḍha', 'ण': 'ṇa',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va',
    'श': 'śa', 'ष': 'ṣa', 'स': 'sa', 'ह': 'ha',
    'ं': 'ṃ', 'ः': 'ḥ', '्': '',
    'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ṛ',
  }

  let result = ''
  for (const char of text) {
    result += map[char] || char
  }
  return result
}
