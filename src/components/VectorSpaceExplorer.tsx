import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Line } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import { Lightbulb, CheckCircle } from 'lucide-react'

// Word vectors with semantic relationships (simplified 3D projection)
const wordVectors = [
  { word: 'reorganize', pos: [0, 0, 0], color: '#3b82f6', similarity: 1.0 },
  { word: 'restructure', pos: [0.3, 0.2, 0.1], color: '#3b82f6', similarity: 0.92 },
  { word: 'refactor', pos: [0.5, 0.4, -0.2], color: '#8b5cf6', similarity: 0.85 },
  { word: 'redesign', pos: [0.7, 0.6, 0.3], color: '#8b5cf6', similarity: 0.78 },
  { word: 'rebuild', pos: [0.9, 0.8, -0.1], color: '#a855f7', similarity: 0.72 },
  { word: 'reorder', pos: [0.2, -0.3, 0.2], color: '#3b82f6', similarity: 0.88 },
  { word: 'simple', pos: [-2, -1.5, 0.5], color: '#ef4444', similarity: 0.45 },
  { word: 'list', pos: [-2.2, -1.8, -0.3], color: '#ef4444', similarity: 0.38 },
  { word: 'minimal', pos: [-1.8, -1.3, 0.8], color: '#ef4444', similarity: 0.52 },
]

function WordPoint({ word, pos, color, onClick, isSelected }: any) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered || isSelected ? 1.5 : 1)
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime + pos[0]) * 0.001
    }
  })

  return (
    <group position={pos}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.8 : 0.3}
        />
      </mesh>
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {word}
      </Text>
    </group>
  )
}

function ConnectionLine({ start, end, opacity }: any) {
  return (
    <Line
      points={[start, end]}
      color="#ffffff"
      lineWidth={1}
      opacity={opacity}
      transparent
    />
  )
}

function VectorScene() {
  const [selectedWord, setSelectedWord] = useState<string | null>('reorganize')

  const selectedVector = wordVectors.find(v => v.word === selectedWord)

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Origin point */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>

      {/* Word points */}
      {wordVectors.map((vector) => (
        <WordPoint
          key={vector.word}
          word={vector.word}
          pos={vector.pos}
          color={vector.color}
          isSelected={vector.word === selectedWord}
          onClick={() => setSelectedWord(vector.word)}
        />
      ))}

      {/* Connection lines from selected word */}
      {selectedVector && wordVectors.map((vector) => {
        if (vector.word === selectedWord) return null
        const opacity = vector.similarity * 0.3
        return (
          <ConnectionLine
            key={`${selectedWord}-${vector.word}`}
            start={selectedVector.pos}
            end={vector.pos}
            opacity={opacity}
          />
        )
      })}

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  )
}

export default function VectorSpaceExplorer() {
  const { addScore, unlockAchievement, completeLevel } = useGameStore()
  const [completed, setCompleted] = useState(false)
  const [interactionCount, setInteractionCount] = useState(0)

  const handleInteraction = () => {
    const newCount = interactionCount + 1
    setInteractionCount(newCount)
    addScore(10)

    if (newCount >= 3 && !completed) {
      setCompleted(true)
      unlockAchievement('first-vector')
      completeLevel('vector-space')
      addScore(100)
    }
  }

  return (
    <div className="container mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Explanation Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h2 className="text-3xl font-bold mb-4">Vector Space Explorer</h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              When you type "reorganize," it doesn't stay as text. It becomes a vector—a point in
              high-dimensional space (768-3072 dimensions!).
            </p>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Similar meanings cluster together. <span className="text-blue-400 font-semibold">"Reorganize"</span> sits
              near <span className="text-blue-400 font-semibold">"refactor"</span> and <span className="text-purple-400 font-semibold">"rebuild"</span> because
              they appear in similar contexts during training.
            </p>
            <p className="text-gray-300 leading-relaxed">
              But <span className="text-red-400 font-semibold">"simple"</span> is far away. In the embedding space, complexity
              has more neighbors. That's why the system struggles with simplicity.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2 text-blue-300">The Cosine Similarity</h3>
                <p className="text-sm text-gray-300 mb-3">
                  Similarity is measured by cosine similarity (angle between vectors):
                </p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• "reorganize" ↔ "refactor": <span className="text-blue-400">0.85</span></li>
                  <li>• "reorganize" ↔ "simple": <span className="text-red-400">0.45</span></li>
                </ul>
                <p className="text-sm text-gray-400 mt-3">
                  Higher similarity = vectors point in similar directions
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
            <h3 className="font-semibold mb-2 text-purple-300">Try It Yourself</h3>
            <p className="text-sm text-gray-300 mb-3">
              Click on different words in the 3D space to see their relationships. Notice how
              complexity-related words cluster together (blue/purple) while simplicity words
              (red) are isolated.
            </p>
            <p className="text-sm text-gray-400">
              Interact with 3 different words to unlock the achievement!
            </p>
          </div>

          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-6"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="font-semibold text-green-300">Level Complete!</h3>
                  <p className="text-sm text-gray-300">
                    You've understood how words become vectors in semantic space.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* 3D Visualization */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden"
          style={{ height: '600px' }}
          onClick={handleInteraction}
        >
          <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
            <VectorScene />
          </Canvas>

          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md rounded-lg px-4 py-2">
            <p className="text-xs text-gray-300">
              Click and drag to rotate • Scroll to zoom • Click words to explore
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
