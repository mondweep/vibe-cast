"""
Lyrics Translation using Claude AI
Translates Assamese lyrics to English while maintaining poetic structure
"""

import os
import sys
from pathlib import Path

try:
    from anthropic import Anthropic
except ImportError:
    print("✗ Error: anthropic package not installed")
    print("Install with: pip install anthropic")
    sys.exit(1)

from dotenv import load_dotenv


def translate_lyrics(assamese_lyrics, api_key=None, output_file=None):
    """
    Translate Assamese lyrics to English using Claude AI

    Args:
        assamese_lyrics: Original Assamese lyrics (string)
        api_key: Anthropic API key (optional, uses env variable if not provided)
        output_file: Optional file path to save translation

    Returns:
        Translated lyrics as string
    """
    # Load environment variables
    load_dotenv()

    if api_key is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")

    if not api_key:
        print("✗ Error: No API key found")
        print("Set ANTHROPIC_API_KEY environment variable or pass api_key parameter")
        return None

    client = Anthropic(api_key=api_key)

    prompt = f"""Please translate these Assamese song lyrics to English.

Requirements:
1. Maintain the poetic structure and emotional tone
2. Keep syllable count similar for musical adaptation
3. Preserve rhythm and rhyme scheme where possible
4. Provide both literal and singable translations

Original Assamese lyrics:
{assamese_lyrics}

Please provide:
1. **Literal Translation**: Word-for-word meaning in English
2. **Singable Adaptation**: English version maintaining syllable count and rhythm
3. **Phonetic Guide**: IPA or simplified pronunciation for English lyrics
4. **Cultural Notes**: Any cultural context that may be lost in translation
"""

    try:
        print("Translating lyrics using Claude AI...")
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        translation = message.content[0].text
        print("✓ Translation complete")

        # Save to file if specified
        if output_file:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("=" * 60 + "\n")
                f.write("ORIGINAL ASSAMESE LYRICS\n")
                f.write("=" * 60 + "\n\n")
                f.write(assamese_lyrics)
                f.write("\n\n" + "=" * 60 + "\n")
                f.write("ENGLISH TRANSLATION\n")
                f.write("=" * 60 + "\n\n")
                f.write(translation)

            print(f"✓ Translation saved to: {output_path}")

        return translation

    except Exception as e:
        print(f"✗ Error during translation: {e}")
        return None


def main():
    """Example usage"""
    if len(sys.argv) < 2:
        print("Usage: python translate_lyrics.py <lyrics_file>")
        print("Example: python translate_lyrics.py assamese_lyrics.txt")
        print("\nOr provide lyrics directly:")
        print("python translate_lyrics.py --text 'Your lyrics here'")
        sys.exit(1)

    if sys.argv[1] == '--text':
        # Lyrics provided directly
        lyrics = ' '.join(sys.argv[2:])
        output_file = './output/translation.txt'
    else:
        # Read from file
        lyrics_file = Path(sys.argv[1])
        if not lyrics_file.exists():
            print(f"✗ Error: File not found: {lyrics_file}")
            sys.exit(1)

        with open(lyrics_file, 'r', encoding='utf-8') as f:
            lyrics = f.read()

        output_file = lyrics_file.parent / f"{lyrics_file.stem}_translation.txt"

    translation = translate_lyrics(lyrics, output_file=str(output_file))

    if translation:
        print("\n" + "=" * 60)
        print("TRANSLATION")
        print("=" * 60)
        print(translation)
        print("\nSuccess!")
    else:
        print("\nFailed to translate lyrics")
        sys.exit(1)


if __name__ == "__main__":
    main()
