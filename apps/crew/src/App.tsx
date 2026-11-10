import { useEffect, useState } from "react";

const DEFAULT_API_BASE = "http://localhost:8000";

type HealthState = "checking" | "ok" | "error";

function App() {
  const [apiBase] = useState(
    () => localStorage.getItem("hestia-api-base") ?? DEFAULT_API_BASE,
  );
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(() => setHealth("ok"))
      .catch(() => setHealth("error"));
  }, [apiBase]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 font-sans px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">HESTIA — Crew</h1>
      {health === "checking" && <p className="text-slate-400">Checking server…</p>}
      {health === "ok" && (
        <p className="text-emerald-400 text-xl font-medium">server OK</p>
      )}
      {health === "error" && (
        <p className="text-red-400 text-xl font-medium">
          server unreachable ({apiBase})
        </p>
      )}
      <p className="text-xs text-slate-500 max-w-xs">
        SIMULATED data only — NOT A MEDICAL DEVICE.
      </p>
    </main>
  );
}

export default App;
