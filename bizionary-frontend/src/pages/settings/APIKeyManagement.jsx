import React from 'react';
import { Lock, Bot, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';

const APIKeyManagement = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Lock className="w-8 h-8" />
          Ollama Setup
        </h1>
        <p className="text-gray-600">
          The chatbot now uses Ollama locally, so you do not need an OpenAI API key.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-lg">What to install</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
            <li>Install Ollama on your PC.</li>
            <li>Start the Ollama service.</li>
            <li>Pull a model, for example: <span className="font-mono">ollama pull llama3.1</span></li>
          </ul>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-lg">Backend settings</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
            <li><span className="font-mono">OLLAMA_HOST</span> defaults to <span className="font-mono">http://localhost:11434</span></li>
            <li><span className="font-mono">OLLAMA_MODEL</span> defaults to <span className="font-mono">llama3.1</span></li>
            <li>No OpenAI key is needed anymore.</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
        <div className="flex items-center gap-2 mb-2 text-blue-800 font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          Recommended setup
        </div>
        <ol className="space-y-2 text-sm text-blue-900 list-decimal pl-5">
          <li>Install Ollama from https://ollama.com</li>
          <li>Run <span className="font-mono">ollama pull llama3.1</span></li>
          <li>Restart the Django server</li>
          <li>Open the chatbot and test a message</li>
        </ol>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2 text-yellow-800 font-semibold">
          <AlertCircle className="w-5 h-5" />
          Troubleshooting
        </div>
        <p className="text-sm text-yellow-900">
          If the chatbot shows a connection error, make sure Ollama is running and reachable at the configured host.
        </p>
      </div>
    </div>
  );
};

export default APIKeyManagement;
