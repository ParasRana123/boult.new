import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebsiteBuilder } from '../context/WebsiteBuilderContext';
import StepsPanel from '../components/StepsPanel';
import FileExplorer from '../components/FileExplorer';
import CodeEditor from '../components/CodeEditor';
import PreviewPanel from '../components/PreviewPanel';
import { Tabs, TabsList, TabsContent } from '../components/ui/Tabs';
import { Code, Eye, ArrowLeft } from 'lucide-react';

const WorkspacePage: React.FC = () => {
  const { project, selectedFile } = useWebsiteBuilder();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

  useEffect(() => {
    if (!project) {
      navigate('/');
    }
  }, [project, navigate]);

  if (!project) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-xl font-semibold truncate">
            {project?.name || 'Untitled Project'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Save
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            Deploy
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Steps panel */}
        <div className="w-64 border-r border-slate-800 bg-slate-900 overflow-y-auto">
          <StepsPanel />
        </div>

        {/* Main workspace */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <div className="border-b border-slate-800">
              <TabsList>
                <button 
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-2 px-6 py-3 focus:outline-none ${
                    activeTab === 'code' 
                      ? 'text-white border-b-2 border-blue-500' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  Code
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-2 px-6 py-3 focus:outline-none ${
                    activeTab === 'preview' 
                      ? 'text-white border-b-2 border-blue-500' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </TabsList>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {activeTab === 'code' ? (
                <>
                  {/* File explorer */}
                  <div className="w-72 border-r border-slate-800 bg-slate-900 overflow-y-auto">
                    <FileExplorer />
                  </div>

                  {/* Code editor */}
                  <div className="flex-1 overflow-hidden">
                    {selectedFile ? (
                      <CodeEditor />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500">
                        Select a file to edit
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <TabsContent value="preview" className="flex-1">
                  <PreviewPanel />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default WorkspacePage;