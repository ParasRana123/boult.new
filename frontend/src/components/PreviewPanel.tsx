import React from 'react';
import { useWebsiteBuilder } from '../context/WebsiteBuilderContext';

const PreviewPanel: React.FC = () => {
  const { previewUrl } = useWebsiteBuilder(); // Ensure this is exposed via context

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="h-full">
      <div className="border-b border-slate-800 px-4 py-2 flex justify-between items-center">
        <span className="text-sm text-slate-400">Preview</span>
        <button
          className="text-sm text-blue-400 hover:text-blue-300"
          onClick={handleOpenInNewTab}
        >
          Open in New Tab
        </button>
      </div>

      <div className="h-[calc(100%-37px)] bg-white">
        {previewUrl ? (
          <iframe
            title="WebContainer Preview"
            src={previewUrl}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading preview...
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;