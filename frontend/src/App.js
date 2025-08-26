import React from 'react';
import { BrowserRouter, Routes, Route, UNSAFE_ErrorResponseImpl } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';
import UploadPage from './pages/UploadPage/UploadPage';
import PreviewPage from './pages/PreviewPage/PreviewPage';
import AnalyzePage from './pages/AnalyzePage/AnalyzePage';
import GenerateGTriePage from './pages/GenerateGtriePage/GenerateGtriePage';
import AnalyzeResultPage from './pages/AnalyzeResultPage/AnalyzeResultPage';
import UploadSecondNetworkPage from './pages/UploadSecondNetworkPage/UploadSecondNetworkPage';
import GdaResultPage from './pages/GdaResultPage/GdaResultPage';
function App() {
  return (
    <BrowserRouter>
      
      <div style={{ paddingTop: '70px', paddingLeft: '20px' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/generate-gtrie" element={<GenerateGTriePage />} />
          <Route path="/analyzeresult" element={<AnalyzeResultPage />} />
          <Route path="/upload-second-network" element={<UploadSecondNetworkPage />} />
          <Route path="/gdaresult" element={<GdaResultPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
