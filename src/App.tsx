import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './app/Layout.tsx';
import { PracticePage } from './app/PracticePage.tsx';
import { FretboardPage } from './app/FretboardPage.tsx';
import { RhythmPage } from './app/RhythmPage.tsx';
import { FlashcardsPage } from './app/FlashcardsPage.tsx';
import { StatsPage } from './app/StatsPage.tsx';
import { AboutPage } from './app/AboutPage.tsx';
import './styles/globals.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PracticePage />} />
          <Route path="fretboard" element={<FretboardPage />} />
          <Route path="rhythm" element={<RhythmPage />} />
          <Route path="flashcards" element={<FlashcardsPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="about" element={<AboutPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
