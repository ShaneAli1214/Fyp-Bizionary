import React from 'react';
import { Lock, Bot, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';

const APIKeyManagement = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-text-primary">
          <Lock className="w-8 h-8 text-accent" />
          Ollama Setup
        </h1>
        <p className="text-text-secondary">
          The chatbot now uses Ollama locally, so you do not need an OpenAI API key.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-lg text-text-primary">What to install</h2>
          </div>
          <ul className="space-y-2 text-sm text-text-secondary list-disc pl-5">
            <li>Install Ollama on your PC.</li>
            <li>Start the Ollama service.</li>
            <li>Pull a model, for example: <span className="font-mono text-text-primary bg-background px-1 py-0.5 rounded">ollama pull llama3.1</span></li>
          </ul>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-5 h-5 text-success" />
            <h2 className="font-semibold text-lg text-text-primary">Backend settings</h2>
          </div>
          <ul className="space-y-2 text-sm text-text-secondary list-disc pl-5">
            <li><span className="font-mono text-text-primary bg-background px-1 py-0.5 rounded">OLLAMA_HOST</span> defaults to <span className="font-mono text-text-primary bg-background px-1 py-0.5 rounded">http://localhost:11434</span></li>
            <li><span className="font-mono text-text-primary bg-background px-1 py-0.5 rounded">OLLAMA_MODEL</span> defaults to <span className="font-mono text-text-primary bg-background px-1 py-0.5 rounded">llama3.1</span></li>
            <li>No OpenAI key is needed anymore.</li>
          </ul>
        </div>
      </div>

      <div className="bg-surface border border-accent rounded-lg p-5 mb-6">
        <div className="flex items-center gap-2 mb-2 text-accent font-semibold">
          <CheckCircle2 className="w-5 h-5 text-success" />
          Recommended setup
        </div>
        <ol className="space-y-2 text-sm text-text-secondary list-decimal pl-5">
          <li>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-accent underline">https://ollama.com</a></li>
          <li>Run <span className="font-mono text-text-primary bg-background px-1 py-0.5 rounded">ollama pull llama3.1</span></li>
          <li>Restart the Django server</li>
          <li>Open the chatbot and test a message</li>
        </ol>
      </div>

      <div className="bg-surface border border-warning rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2 text-warning font-semibold">
          <AlertCircle className="w-5 h-5 text-warning" />
          Troubleshooting
        </div>
        <p className="text-sm text-text-secondary">
          If the chatbot shows a connection error, make sure Ollama is running and reachable at the configured host.
        </p>
      </div>
    </div>
  );
};

export default APIKeyManagement;
