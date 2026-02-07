"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function DebugPage() {
  const [env, setEnv] = useState({});
  const [cookies, setCookies] = useState("");

  useEffect(() => {
    setEnv({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_ALLOWED_ORIGINS: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS,
      NODE_ENV: process.env.NODE_ENV,
      currentUrl: window.location.href,
    });
    setCookies(document.cookie);
  }, []);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Debug Info</h1>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="font-semibold mb-2">Environment Variables:</h2>
        <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-auto">
          {JSON.stringify(env, null, 2)}
        </pre>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="font-semibold mb-2">Cookies:</h2>
        <p className="text-xs break-all">{cookies || "No cookies"}</p>
      </div>

      <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded">
        <h2 className="font-semibold mb-2">Test API:</h2>
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/v1/workspaces");
              const data = await res.json();
              alert(JSON.stringify(data, null, 2));
            } catch (err) {
              alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test /api/v1/workspaces
        </button>
      </div>

      <div className="mt-8">
        <a href="/dashboard" className="text-blue-500 underline">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
