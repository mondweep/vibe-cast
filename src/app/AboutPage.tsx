export function AboutPage() {
    return (
        <div className="page about-page">
            <h2>About This App</h2>
            <p className="page__subtitle">Why the RSD Guitar Internalizer exists</p>

            <section className="about-section">
                <h3>🎯 The Problem</h3>
                <p>
                    Learning guitar isn't just about sitting with the instrument — it's about
                    <strong> internalizing</strong> patterns until they become second nature. Students of
                    guitar lessons often struggle to retain chord progressions, timing, and finger
                    placements between practice sessions. Commuting, waiting, or any time away
                    from the guitar becomes wasted practice time.
                </p>
            </section>

            <section className="about-section">
                <h3>💡 The Inspiration</h3>
                <p>
                    This app was born from a real <strong>Assamese guitar lesson</strong> by
                    {' '}<strong>RSD Guitar Stories</strong>, where an instructor teaches a specific
                    chord progression with precise timing, silence techniques, and fingerstyle patterns.
                    The lesson covers:
                </p>
                <ul className="about-list">
                    <li><strong>Bar 1:</strong> Am → Am9 transition on beat 3</li>
                    <li><strong>Bar 2:</strong> C → D chord change</li>
                    <li><strong>Bar 3:</strong> Fmaj7 sustained with a deliberate silence on beat 3</li>
                    <li><strong>Bar 4:</strong> G → Am bridge transition</li>
                </ul>
                <p>
                    The instructor emphasizes <em>"internalization"</em> — being able to recall and
                    execute these patterns without thinking. This app digitizes that philosophy.
                </p>
            </section>

            <section className="about-section">
                <h3>🧠 The Approach</h3>
                <p>
                    Drawing from research into proven learning methods, this app combines:
                </p>
                <ul className="about-list">
                    <li>
                        <strong>Spaced Repetition</strong> (like Anki) — flashcards for chord shapes and
                        techniques that resurface based on confidence
                    </li>
                    <li>
                        <strong>Interactive Visualization</strong> (like Yousician) — virtual fretboard
                        drills where you tap correct finger placements
                    </li>
                    <li>
                        <strong>Rhythmic Training</strong> — a metronome with audio synthesis that plays
                        actual chord tones as the progression advances
                    </li>
                    <li>
                        <strong>Gamification</strong> — daily streak tracking to build consistent practice
                        habits
                    </li>
                </ul>
            </section>

            <section className="about-section">
                <h3>🎸 Who It's For</h3>
                <p>
                    Students of RSD Guitar lessons (and any beginner guitarist) who want to practice
                    <strong> away from their instrument</strong> — on a commute, during a break, or
                    anywhere with a phone or laptop. The goal is to build muscle memory and
                    rhythmic intuition so that when you pick up the guitar, your fingers already
                    know where to go.
                </p>
            </section>
        </div>
    );
}
