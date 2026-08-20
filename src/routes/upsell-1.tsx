import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/upsell-1")({
  component: CloneRoute,
});

function CloneRoute() {
  useEffect(() => {
    window.location.replace(`/up1/index.html${window.location.search}${window.location.hash}`);
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 text-center text-slate-950">
      <p className="text-sm font-bold">Loading...</p>
    </main>
  );
}
