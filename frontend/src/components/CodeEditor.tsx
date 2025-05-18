import React, { useState } from 'react';
import { useWebsiteBuilder } from '../context/WebsiteBuilderContext';
import Editor from '@monaco-editor/react';

const CodeEditor: React.FC = () => {
  const { selectedFile, updateFile } = useWebsiteBuilder();
  const [editorContent, setEditorContent] = useState<string>(selectedFile?.content || '');

  if (!selectedFile) {
    return <div className="h-full flex items-center justify-center">No file selected</div>;
  }

  const handleEditorChange = (value: string = '') => {
    setEditorContent(value);
    updateFile({
      ...selectedFile,
      content: value,
    });
  };

  const getLanguage = (file: string): string => {
    const extension = file.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
      case 'js':
        return 'javascript';
      case 'jsx':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'tsx':
        return 'typescript';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'plaintext';
    }
  };

  return (
    <div className="h-full">
      <div className="border-b border-slate-800 px-4 py-2 text-sm text-slate-400">
        {selectedFile.path}
      </div>
      <Editor
        height="calc(100% - 37px)"
        language={getLanguage(selectedFile.name)}
        value={selectedFile.content}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
          fontLigatures: true,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};

export default CodeEditor;