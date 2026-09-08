import React from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { Step } from '../types';

interface StepsListProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export function StepsList({ steps, currentStep, onStepClick }: StepsListProps) {
  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 h-full overflow-auto border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-100">Build Steps</h2>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
          {steps.filter(s => s.status === 'completed').length}/{steps.length}
        </span>
      </div>
      <div className="space-y-3">
        {steps.map((step) => {
          const isInProgress = step.status === 'in-progress';
          const isCompleted = step.status === 'completed';

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                isInProgress
                  ? 'bg-purple-950/30 border border-purple-500/40 shadow-sm'
                  : currentStep === step.id
                  ? 'bg-gray-800 border border-gray-700'
                  : 'hover:bg-gray-800/60 border border-transparent'
              }`}
              onClick={() => onStepClick(step.id)}
            >
              <div className="flex items-center gap-2.5">
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : isInProgress ? (
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-medium truncate ${
                    isInProgress ? 'text-purple-200' : isCompleted ? 'text-gray-200' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </h3>
                  {step.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {step.description}
                    </p>
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