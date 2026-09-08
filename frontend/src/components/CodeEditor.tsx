import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { FileCode, Loader2, Sparkles } from 'lucide-react';
import { FileItem } from '../types';

interface CodeEditorProps {
  file: FileItem | null;
  isWriting?: boolean;
}

function getLanguage(path?: string): string {
  if (!path) return 'typescript';
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.jsx') || path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  return 'typescript';
}

export function CodeEditor({ file, isWriting = false }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Auto-scroll to the bottom of the editor while file is actively writing
  useEffect(() => {
    if (editorRef.current && isWriting && file?.content) {
      const lineCount = editorRef.current.getModel()?.getLineCount() || 1;
      editorRef.current.revealLine(lineCount);
    }
  }, [file?.content, isWriting]);

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950 rounded-b-lg border border-t-0 border-gray-800">
        <FileCode className="w-12 h-12 mb-3 text-gray-600" />
        <p className="text-sm font-medium">Select a file from the explorer or wait for build steps</p>
      </div>
    );
  }

  const language = getLanguage(file.path);
  const lineCount = (file.content || '').split('\n').length;

  return (
    <div className="h-full flex flex-col bg-gray-950 rounded-b-lg border border-t-0 border-gray-800 overflow-hidden">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-gray-200 font-medium">
            {file.path || file.name}
          </span>
          <span className="text-gray-500 font-mono">({lineCount} lines)</span>
        </div>

        <div className="flex items-center gap-2">
          {isWriting ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-500/50 text-purple-300 font-mono animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
              <span>AI Writing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono uppercase text-[10px]">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{language}</span>
            </div>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 w-full h-full">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={file.content || ''}
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}