import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Une erreur inattendue est survenue.',
    };
  }

  render() {
    if (this.state.hasError) {
      let readable = 'Une erreur technique est survenue lors de la synchronisation.';
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          readable = `Accès ou opération refusée (${parsed.operationType || 'base'}): ${parsed.error}`;
        }
      } catch {
        readable = this.state.errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E4E4E0] rounded-xl p-8">
            <div className="w-11 h-11 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-[#141413] mb-2">
              Interruption momentanée
            </h1>
            <p className="text-sm text-[#575752] leading-relaxed mb-6">{readable}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F5132] text-white text-sm font-medium rounded-lg hover:bg-[#0B3D26] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Recharger Dilservice
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
