import React from "react";

import "../styles/loadingScreen.css";

export default class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Attractor Network Lab failed to start:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="loading-screen startup-error-screen" role="alert">
        <div className="loading-content">
          <img
            className="loading-logo"
            src="/university-of-maryland.webp"
            alt="University of Maryland"
          />
          <h1>Attractor Network Lab</h1>
          <p>We could not start the application. Check the browser console for details.</p>
        </div>
      </main>
    );
  }
}
