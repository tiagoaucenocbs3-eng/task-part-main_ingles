import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TikTok Rewards" },
      { name: "description", content: "Claim your TikTok reward and get paid instantly to Cash App, PayPal, Venmo, Zelle, or your bank." },
      { property: "og:title", content: "TikTok Rewards" },
      { property: "og:description", content: "Claim your TikTok reward and get paid instantly to Cash App, PayPal, Venmo, Zelle, or your bank." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("__route") === "tasks-app") {
      params.delete("__route");
      const search = Object.fromEntries(params.entries());
      void navigate({ to: "/tasks-app", replace: true, search });
      return;
    }

  }, [navigate]);

  return null;
}
