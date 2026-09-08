import React from 'react';
import { CheckCircle, Circle, Loader2, Sparkles } from 'lucide-react';
import { Step } from '../types';

interface StepsListProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export function StepsList({ steps, currentStep, onStepClick }: StepsListProps) {
  const completedCount = steps.filter(s => s.status === 'completed').length;

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 h-full overflow-auto border border-gray-800 flex flex-col">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h2 className="text-base font-semibold text-gray-100">Build Steps</h2>
        </div>
        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-gray-800 text-purple-300 border border-gray-700">
          {completedCount} / {steps.length}
        </span>
      </div>

      <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
        {steps.map((step) => {
          const isInProgress = step.status === 'in-progress';
          const isCompleted = step.status === 'completed';
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                isInProgress
                  ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-950/50 ring-1 ring-purple-500/20'
                  : isCurrent
                  ? 'bg-gray-800/90 border-gray-600 shadow-sm'
                  : isCompleted
                  ? 'bg-gray-900/80 border-gray-800/80 hover:bg-gray-800/50'
                  : 'bg-gray-900/40 border-gray-800/40 hover:bg-gray-800/30'
              }`}
              onClick={() => onStepClick(step.id)}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left status & info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                    {isCompleted ? (
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                    ) : isInProgress ? (
                      <div className="relative flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                      </div>
                    ) : (
                      <Circle className="w-4 h-4 text-gray-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className={`text-sm font-medium truncate ${
                      isInProgress
                        ? 'text-purple-200 font-semibold'
                        : isCompleted
                        ? 'text-gray-200'
                        : 'text-gray-400'
                    }`}>
                      {step.title}
                    </h3>
                    {step.path && (
                      <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                        {step.path}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right loading spinner indicator for in-progress step */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  {isInProgress && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-medium animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      <span>Writing...</span>
                    </div>
                  )}
                  {isCompleted && (
                    <span className="text-[11px] font-mono text-emerald-400/80 font-medium">
                      Done
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}