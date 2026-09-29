import React, { useEffect, useState } from "react";

import "../styles/loadingScreen.css";

const HEALTH_CHECK_INTERVAL = 2000;
const HEALTH_CHECK_TIMEOUT = 10000;

async function isBackendReady(apiUrl) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    HEALTH_CHECK_TIMEOUT
  );

  try {
    const response = await fetch(`${apiUrl}/health`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function LoadingScreen({ onReady }) {
  const [apiConfigured, setApiConfigured] = useState(true);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

    if (!apiUrl) {
      setApiConfigured(false);
      return undefined;
    }

    let cancelled = false;
    let retryTimeoutId;

    const checkBackend = async () => {
      const ready = await isBackendReady(apiUrl);

      if (cancelled) return;

      if (ready) {
        onReady();
        return;
      }

      retryTimeoutId = window.setTimeout(checkBackend, HEALTH_CHECK_INTERVAL);
    };

    checkBackend();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimeoutId);
    };
  }, [onReady]);

  return (
    <main className="loading-screen" aria-live="polite">
      <div className="loading-content">
        <img
          className="loading-logo"
          src="/university-of-maryland.webp"
          alt="University of Maryland"
        />
        <h1>Attractor Network Lab</h1>
        <p className="loading-affiliation">University of Maryland - SEAM Lab</p>

        <div
          className="loading-progress"
          role="progressbar"
          aria-label="Connecting to the Attractor Network Lab backend"
          aria-valuetext={
            apiConfigured ? "Waiting for the backend" : "Backend URL missing"
          }
        >
          <span />
        </div>
        <p className="loading-status">Preparing Backend...</p>

        <div className="loading-details">
          <section>
            <h2>Contributors</h2>
            <p className="loading-contributor-line">
              Pranav Khatri, Ryan DeCamp, Vihaan Motwani, Abdullatif Elmuaqaat,
              Shaun Fernandes
            </p>
          </section>
          <section>
            <h2>Credits to</h2>
            <p className="loading-credit-line">
              Arya Teymourlouei, James Purtilo
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
