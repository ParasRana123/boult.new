import React from 'react';
import { useWebsiteBuilder } from '../context/WebsiteBuilderContext';
import { Folder, FileText } from 'lucide-react';
import { WebsiteFile, WebsiteFolder } from '../types';

const FileExplorer: React.FC = () => {
  const { project, selectFile, selectedFile } = useWebsiteBuilder();

  if (!project) {
    return <div className="p-4">No project loaded</div>;
  }

  const renderFolder = (folder: WebsiteFolder, depth = 0) => {
    return (
      <div key={folder.path} className="space-y-1">
        <div className="flex items-center gap-2 px-3 py-1.5 text-slate-300 font-medium">
          <Folder className="w-4 h-4 text-blue-400" />
          <span>{folder.name}</span>
        </div>

        <div className="pl-4">
          {/* Files */}
          {folder.files.map((file) => renderFile(file))}
          
          {/* Subfolders */}
          {folder.folders.map((subfolder) => renderFolder(subfolder, depth + 1))}
        </div>
      </div>
    );
  };

  const renderFile = (file: WebsiteFile) => {
    const isSelected = selectedFile?.path === file.path;
    
    return (
      <div 
        key={file.path}
        className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer ${
          isSelected 
            ? 'bg-blue-600/30 text-blue-200' 
            : 'text-slate-300 hover:bg-slate-800'
        }`}
        onClick={() => selectFile(file)}
      >
        <FileText className="w-4 h-4 text-slate-400" />
        <span>{file.name}</span>
      </div>
    );
  };

  return (
    <div className="p-2">
      <div className="mb-2 px-3 py-2 text-slate-400 text-sm font-medium">
        Files
      </div>
      <div className="space-y-1 mt-2">
        {renderFolder(project.rootFolder)}
      </div>
    </div>
  );
};

export default FileExplorer;