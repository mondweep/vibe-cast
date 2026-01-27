import './App.css'
import { Tag } from './components/Tag'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 font-poppins">
          Pix Demo Project
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Component generated from Figma with /pix
        </p>

        {/* Generated component from Figma */}
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Tag Component (from Figma)
          </h2>

          {/* The actual Figma component */}
          <div className="flex flex-col items-center gap-4">
            <Tag>Styles</Tag>

            <p className="text-sm text-gray-500 mt-4">
              Extracted from: Simple UI Kit → Tags (Information)
            </p>
          </div>
        </div>

        {/* Design specs reference */}
        <div className="mt-8 text-left max-w-lg mx-auto bg-gray-900 text-gray-100 rounded-lg p-6 font-mono text-sm">
          <p className="text-green-400 mb-2">// Figma Design Specs:</p>
          <p>Background: <span className="text-blue-400">#2871E6</span></p>
          <p>Text: <span className="text-white">#FFFFFF</span>, Poppins Medium</p>
          <p>Font Size: <span className="text-yellow-400">36px</span></p>
          <p>Padding: <span className="text-yellow-400">16px 24px</span></p>
          <p>Border Radius: <span className="text-yellow-400">100px</span> (pill)</p>
        </div>
      </div>
    </div>
  )
}

export default App
