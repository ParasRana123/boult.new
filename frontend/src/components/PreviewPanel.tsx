import React, { useMemo } from 'react';
import { useWebsiteBuilder } from '../context/WebsiteBuilderContext';

const PreviewPanel: React.FC = () => {
  const { project } = useWebsiteBuilder();

  const generatePreviewHtml = useMemo(() => {
    if (!project) return '';
    
    // Find HTML file in the root folder
    const htmlFile = project.rootFolder.files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) return '<div>No HTML file found in the project</div>';
    
    // Find CSS file in the root folder
    const cssFile = project.rootFolder.files.find(f => f.name.endsWith('.css'));
    const cssContent = cssFile ? `<style>${cssFile.content}</style>` : '';
    
    // Find JS file in the root folder
    const jsFile = project.rootFolder.files.find(f => f.name.endsWith('.js'));
    const jsContent = jsFile ? `<script>${jsFile.content}</script>` : '';
    
    // Combine into a single HTML document
    let html = htmlFile.content;
    
    // Replace </head> with CSS content + </head>
    if (cssContent) {
      html = html.replace('</head>', `${cssContent}</head>`);
    }
    
    // Replace </body> with JS content + </body>
    if (jsContent) {
      html = html.replace('</body>', `${jsContent}</body>`);
    }
    
    return html;
  }, [project]);

  return (
    <div className="h-full">
      <div className="border-b border-slate-800 px-4 py-2 flex justify-between items-center">
        <span className="text-sm text-slate-400">Preview</span>
        <button className="text-sm text-blue-400 hover:text-blue-300">
          Open in New Tab
        </button>
      </div>
      
      <div className="h-[calc(100%-37px)] bg-white">
        <iframe
          title="Website Preview"
          srcDoc={generatePreviewHtml}
          className="w-full h-full border-none"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
};

export default PreviewPanel;