import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  fullScreen?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fullScreen) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="max-w-md w-full p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">
                    {this.props.fallbackMessage || 'Niečo sa pokazilo'}
                  </h2>
                  <p className="text-muted-foreground">
                    Vyskytla sa neočakávaná chyba. Skúste obnoviť stránku.
                  </p>
                </div>

                {this.state.error && (
                  <details className="w-full text-left">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      Technické detaily
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                      {this.state.error.message}
                      {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                <Button
                  onClick={this.handleReset}
                  className="w-full gap-2"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4" />
                  Skúsiť znova
                </Button>
              </div>
            </Card>
          </div>
        );
      }

      return (
        <div className="p-6">
          <Alert variant="destructive">
            <AlertTitle>
              {this.props.fallbackMessage || 'Chyba pri načítaní detailu'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-2">
                <p className="font-mono text-sm">
                  {this.state.error?.message || 'Neznáma chyba'}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">
                      Technické detaily
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-48 bg-muted p-2 rounded">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Skúsiť znova
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
