import { CommandIntent } from './CommandIntent';
import { VoiceCommand } from './VoiceCommand';

/**
 * CommandPattern - Represents a regex pattern for recognizing a command intent
 */
interface CommandPattern {
  intent: CommandIntent;
  patterns: RegExp[];
  baseConfidence: number;
}

/**
 * CommandRecognitionService - Recognizes voice commands from transcripts
 * Uses regex patterns and fuzzy matching for robustness
 */
export class CommandRecognitionService {
  private patterns: CommandPattern[];

  constructor() {
    this.patterns = [
      {
        intent: CommandIntent.PAUSE,
        patterns: [
          /\bpause\b/i,
          /\bstop\b/i,
          /\bhold\s+on\b/i,
          /\bhush\b/i,
          /\bquiet\b/i,
          /\bwait\b/i,
        ],
        baseConfidence: 0.95,
      },
      {
        intent: CommandIntent.CONTINUE,
        patterns: [
          /\bcontinue\b/i,
          /\bresume\b/i,
          /\bkeep\s+going\b/i,
          /\bgo\s+on\b/i,
          /\bmore\b/i,
          /\bnext\b/i,
        ],
        baseConfidence: 0.95,
      },
      {
        intent: CommandIntent.SKIP,
        patterns: [
          /\bskip\b/i,
          /\bskip\s+this\b/i,
          /\bnext\s+one\b/i,
          /\bnext\s+fact\b/i,
          /\bnext\b/i,
          /\bdifferent\b/i,
          /\bchange\b/i,
        ],
        baseConfidence: 0.9,
      },
      {
        intent: CommandIntent.MORE_OFTEN,
        patterns: [
          /\bmore\s+often\b/i,
          /\bmore\s+frequent\b/i,
          /\bincreas\b/i,
          /\bspeed\s+up\b/i,
          /\nfaster\b/i,
          /\bfaster\s+facts\b/i,
          /\bshorter?\s+interval\b/i,
        ],
        baseConfidence: 0.85,
      },
      {
        intent: CommandIntent.LESS_OFTEN,
        patterns: [
          /\bless\s+often\b/i,
          /\bless\s+frequent\b/i,
          /\bslower\b/i,
          /\bslow\s+down\b/i,
          /\ndecreas\b/i,
          /\blonger?\s+interval\b/i,
          /\bfewer\b/i,
        ],
        baseConfidence: 0.85,
      },
      {
        intent: CommandIntent.FOLLOW_UP,
        patterns: [
          /\bwhat\b/i,
          /\bwhy\b/i,
          /\bhow\b/i,
          /\bwhen\b/i,
          /\bwhere\b/i,
          /\bwho\b/i,
          /\btell\s+me/i,
          /\bexplain\b/i,
          /\bmore\s+about\b/i,
        ],
        baseConfidence: 0.75,
      },
    ];
  }

  /**
   * Recognize a command from a transcript
   * @param transcript - User's voice transcript
   * @returns VoiceCommand with recognized intent and confidence
   */
  recognizeCommand(transcript: string): VoiceCommand {
    if (!transcript || transcript.trim().length === 0) {
      // Empty transcript defaults to FOLLOW_UP with low confidence
      return VoiceCommand.create(CommandIntent.FOLLOW_UP, transcript, 0.3);
    }

    const trimmed = transcript.trim();
    const matches: Array<{ intent: CommandIntent; confidence: number }> = [];

    // Try to match each pattern
    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(trimmed)) {
          matches.push({
            intent: pattern.intent,
            confidence: pattern.baseConfidence,
          });
        }
      }
    }

    // If we have matches, return the one with highest confidence
    if (matches.length > 0) {
      const best = matches.reduce((a, b) =>
        a.confidence >= b.confidence ? a : b,
      );
      return VoiceCommand.create(best.intent, trimmed, best.confidence);
    }

    // No clear match - default to FOLLOW_UP with medium confidence
    return VoiceCommand.create(CommandIntent.FOLLOW_UP, trimmed, 0.6);
  }

  /**
   * Recognize commands with fuzzy matching for typos/variations
   * @param transcript - User's voice transcript
   * @param threshold - Minimum levenshtein distance ratio (0-1)
   */
  recognizeCommandFuzzy(transcript: string, threshold: number = 0.75): VoiceCommand {
    const trimmed = transcript.trim().toLowerCase();

    if (!trimmed) {
      return VoiceCommand.create(CommandIntent.FOLLOW_UP, transcript, 0.3);
    }

    // First try exact regex matching
    const exactMatch = this.recognizeCommand(transcript);
    if (exactMatch.isHighConfidence() || exactMatch.isMediumConfidence()) {
      return exactMatch;
    }

    // Then try fuzzy matching on known keywords
    const keywords: Record<CommandIntent, string[]> = {
      [CommandIntent.PAUSE]: ['pause', 'stop', 'hold', 'wait', 'hush'],
      [CommandIntent.CONTINUE]: ['continue', 'resume', 'go', 'more', 'next'],
      [CommandIntent.SKIP]: ['skip', 'next', 'different', 'change', 'other'],
      [CommandIntent.MORE_OFTEN]: ['more', 'increase', 'speed', 'faster', 'frequent'],
      [CommandIntent.LESS_OFTEN]: ['less', 'decrease', 'slow', 'longer', 'fewer'],
      [CommandIntent.FOLLOW_UP]: ['what', 'why', 'how', 'when', 'where', 'tell', 'explain'],
    };

    let bestMatch: { intent: CommandIntent; similarity: number } | null = null;

    for (const [intent, words] of Object.entries(keywords)) {
      for (const word of words) {
        const similarity = this.levenshteinSimilarity(trimmed, word);
        if (similarity >= threshold) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { intent: intent as CommandIntent, similarity };
          }
        }
      }
    }

    if (bestMatch) {
      // Convert similarity to confidence (0-1)
      const confidence = Math.min(0.9, bestMatch.similarity);
      return VoiceCommand.create(bestMatch.intent, trimmed, confidence);
    }

    // Ultimate fallback
    return VoiceCommand.create(CommandIntent.FOLLOW_UP, trimmed, 0.5);
  }

  /**
   * Calculate Levenshtein distance similarity (0-1) between two strings
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const dist = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    return 1 - dist / Math.max(1, maxLen);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
