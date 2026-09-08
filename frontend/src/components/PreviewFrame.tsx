import { WebContainer } from '@webcontainer/api';
import React, { useEffect, useState, useRef } from 'react';
import { Loader2, Globe, Terminal, RefreshCw, AlertTriangle } from 'lucide-react';

interface PreviewFrameProps {
  files: any[];
  webContainer?: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState<string>("");
  const [status, setStatus] = useState<string>("Initializing WebContainer runtime...");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isRunningRef = useRef<boolean>(false);

  const startDevServer = async () => {
    if (!webContainer || files.length === 0 || isRunningRef.current) return;

    try {
      isRunningRef.current = true;
      setError(null);
      setStatus("Installing project dependencies...");
      setTerminalOutput((prev) => [...prev, "$ npm install"]);

      const installProcess = await webContainer.spawn('npm', ['install']);

      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            setTerminalOutput((prev) => [...prev.slice(-40), data]);
          },
        })
      );

      const exitCode = await installProcess.exit;
      if (exitCode !== 0) {
        throw new Error(`npm install failed with code ${exitCode}`);
      }

      setStatus("Starting Vite development server...");
      setTerminalOutput((prev) => [...prev, "$ npm run dev"]);

      const devProcess = await webContainer.spawn('npm', ['run', 'dev']);

      devProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            setTerminalOutput((prev) => [...prev.slice(-40), data]);
          },
        })
      );

      webContainer.on('server-ready', (port, serverUrl) => {
        console.log(`WebContainer Server ready at port ${port}: ${serverUrl}`);
        setUrl(serverUrl);
        setStatus("Live Server Ready");
      });
    } catch (err: any) {
      console.error("PreviewFrame runtime error:", err);
      setError(err?.message || "Failed to launch WebContainer dev server");
      setStatus("Execution Error");
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    if (webContainer && files.length > 0 && !url && !isRunningRef.current) {
      startDevServer();
    }
  }, [webContainer, files.length, url]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-gray-400 bg-gray-950 rounded-b-lg border border-t-0 border-gray-800">
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-200 mb-1">Sandbox Execution Failed</h3>
        <p className="text-xs text-gray-400 text-center max-w-md mb-4">{error}</p>
        <button
          onClick={() => {
            isRunningRef.current = false;
            startDevServer();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-md"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Sandbox
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 rounded-b-lg border border-t-0 border-gray-800 overflow-hidden">
      {/* Sandbox Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-gray-300 truncate font-medium">
            {url ? url : "WebContainer Sandbox"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!url ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300 text-[11px] animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
              <span>{status}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Preview</span>
            </div>
          )}
        </div>
      </div>

      {/* Frame / Loading State */}
      <div className="flex-1 w-full h-full relative bg-gray-950">
        {!url ? (
          <div className="h-full flex flex-col items-center justify-center p-6 space-y-4">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-purple-500/20 opacity-75"></span>
              <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/50 flex items-center justify-center shadow-lg shadow-purple-950/50">
                <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-gray-200">{status}</p>
              <p className="text-xs text-gray-500 mt-1">Booting in-browser Node.js sandbox...</p>
            </div>

            {/* Terminal log snippet */}
            {terminalOutput.length > 0 && (
              <div className="w-full max-w-lg bg-gray-900/90 rounded-lg p-3 border border-gray-800 text-[11px] font-mono text-gray-400 max-h-32 overflow-y-auto space-y-0.5 text-left">
                <div className="flex items-center gap-1 text-purple-400 text-[10px] font-bold mb-1">
                  <Terminal className="w-3 h-3" />
                  <span>Build Terminal</span>
                </div>
                {terminalOutput.slice(-5).map((line, i) => (
                  <div key={i} className="truncate">{line}</div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <iframe
            title="WebContainer App Preview"
            width="100%"
            height="100%"
            src={url}
            className="w-full h-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}