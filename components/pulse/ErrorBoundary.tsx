"use client";
import { Component, ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="error-state">
          <h1>Let’s get the pulse back.</h1>
          <p>
            Something interrupted this view. Your saved activity is still on
            this device.
          </p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Reload dashboard
          </button>
        </main>
      );
    return this.props.children;
  }
}
