import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PanoramaPage } from './pages/PanoramaPage';
import { ClientsPage } from './pages/ClientsPage';
import { EyewearPage } from './pages/EyewearPage';
import { LensesPage } from './pages/LensesPage';
import { AtelierPage } from './pages/AtelierPage';
import { EditorPage } from './pages/EditorPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PanoramaPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/module/clients" element={<ClientsPage />} />
        <Route path="/module/eyewear" element={<EyewearPage />} />
        <Route path="/module/lenses" element={<LensesPage />} />
        <Route path="/module/atelier" element={<AtelierPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
