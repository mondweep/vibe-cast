# Axomiya - The AI-Enhanced Assamese Companion

A mobile-first PWA that provides travellers in Assam with a seamless communication bridge, combining street-verified local phrases with real-time AI translation.

## Features

### Street-Verified Vault (Offline First)
- 80+ essential Assamese phrases across 8 categories
- Respect Toggle: Switch between Deuta (Male Elder) and Maa (Female Elder) honorifics
- Works completely offline
- Phonetic guides for pronunciation
- One-tap copy to clipboard

### Live-Talk AI Bridge (Online)
- Real-time English to Assamese translation via Google Cloud Translation API
- Intelligent caching: Translations are saved to IndexedDB for offline access
- Character usage tracking (500k/month free tier)
- Skeleton loaders for premium UX

### Categories Covered
- Greetings & Basics
- Taxis & Transport
- Markets & Shopping
- Food & Dining
- Directions & Places
- Tourist Spots (Kaziranga, Majuli, Kamakhya, Tea Gardens)
- Emergency & Help
- Numbers & Time

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS 4 (Mobile-first)
- **PWA**: Vite PWA Plugin + Workbox
- **Caching**: IndexedDB (idb library)
- **Hosting**: Netlify
- **Translation**: Google Cloud Translation API (via Netlify Functions)

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
cd axomiya
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Deployment to Netlify

1. Connect your repository to Netlify
2. Set the build command: `npm run build`
3. Set the publish directory: `dist`
4. Add environment variable: `GOOGLE_TRANSLATE_API_KEY`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud Translation API key |

## Project Structure

```
axomiya/
├── netlify/
│   └── functions/
│       └── translate.js      # Serverless translation function
├── public/
│   ├── pwa-192x192.svg       # PWA icon
│   ├── pwa-512x512.svg       # PWA icon (large)
│   └── apple-touch-icon.svg  # iOS icon
├── src/
│   ├── components/
│   │   ├── Header.jsx        # App header with connectivity indicator
│   │   ├── LiveTranslate.jsx # AI translation interface
│   │   ├── Phrasebook.jsx    # Street-verified vault
│   │   ├── PhraseCard.jsx    # Individual phrase display
│   │   ├── RecentTranslations.jsx
│   │   ├── RespectToggle.jsx # Deuta/Maa toggle
│   │   └── TabNavigation.jsx
│   ├── data/
│   │   └── phrasebook.json   # 80+ curated phrases
│   ├── hooks/
│   │   ├── useOnlineStatus.js
│   │   └── useTranslation.js
│   ├── utils/
│   │   └── db.js             # IndexedDB utilities
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── netlify.toml
├── vite.config.js
└── package.json
```

## Cultural Notes

The app includes cultural context for the Assamese language:
- **Deuta**: Respectful address for elder males (like "Sir" or "Father figure")
- **Maa**: Respectful address for elder females (like "Ma'am" or "Mother figure")
- **Namaskar/Nomoskar**: Universal greeting
- **Assam Tea**: World-famous tea from the region
- **Muga Silk**: Prestigious golden Assamese silk

## Places to Visit in Assam

- **Kaziranga National Park**: UNESCO World Heritage Site, home to the one-horned rhinoceros
- **Majuli Island**: World's largest river island, cultural hub of Assamese civilization
- **Kamakhya Temple**: Ancient Hindu temple in Guwahati
- **Tea Gardens**: Scenic plantations throughout Upper Assam
- **Sivasagar**: Historical capital with Ahom-era monuments

## Author

Created by [Mondweep Chakravorty](https://www.linkedin.com/in/mondweepchakravorty/) for travelers exploring beautiful Assam.

Feel free to use this app responsibly and build upon it!

## License

Licensed under the [Apache License 2.0](LICENSE)
