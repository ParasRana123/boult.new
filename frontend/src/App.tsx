import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import WorkspacePage from './pages/WorkspacePage';
import { WebsiteBuilderProvider } from './context/WebsiteBuilderContext';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <WebsiteBuilderProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
        </Routes>
      </WebsiteBuilderProvider>
    </div>
  );
}

export default App;