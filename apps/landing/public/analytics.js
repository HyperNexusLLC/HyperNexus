// HyperNexus funnel analytics — Plausible custom events.
// Included (defer) on every funnel page together with the Plausible script.
// Event delegation means pages need no inline JS except success hooks (hnTrack).
//
// Funnel: landing → get-started/pricing → register (signup) → checkout (Stripe).
// Events fire at each conversion step so Plausible can build a funnel report.
//
// Public API: window.hnTrack(eventName, props?)

(function () {
  "use strict";

  // 1. Plausible stub — queues events until the external script loads (safety net).
  if (typeof window.plausible !== "function") {
    window.plausible = function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  }

  // 2. Public tracker. Never throws — analytics must never break the page.
  window.hnTrack = function (event, props) {
    try {
      if (!event) return;
      window.plausible(event, props ? { props: props } : undefined);
    } catch (e) {
      /* ignore */
    }
  };

  // 3. Event delegation: map funnel CTAs + form submits to conversion events.
  function fire(event, props) {
    window.hnTrack(event, props);
  }

  function wire() {
    // Click tracking — resolve the funnel step from the link href / text.
    document.addEventListener("click", function (e) {
      try {
        var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
        if (!a) return;
        var href = (a.getAttribute("href") || "") + " " + (a.textContent || "");
        var h = href.toLowerCase();
        if (/\/auth\/register|create account|create one|get started|get-started/.test(h)) {
          fire("funnel_get_started", { via: (a.textContent || "link").trim().slice(0, 40) });
        } else if (/\/auth\/login|sign in/.test(h)) {
          fire("funnel_login_start", { via: (a.textContent || "link").trim().slice(0, 40) });
        } else if (/\/checkout\/guest|buy as guest/.test(h)) {
          fire("funnel_guest_checkout", {});
        } else if (/\/checkout|pay \$|buy now|subscribe/.test(h)) {
          fire("funnel_checkout_start", { via: (a.textContent || "link").trim().slice(0, 40) });
        } else if (/pricing/.test(h)) {
          fire("funnel_pricing_view", { via: (a.textContent || "link").trim().slice(0, 40) });
        } else if (/demo\./.test(h)) {
          fire("funnel_demo_start", {});
        } else if (/cloud\.hypernexus|\/download/.test(h)) {
          fire("funnel_product_cta", { via: (a.textContent || "link").trim().slice(0, 40) });
        }
      } catch (err) {
        /* ignore */
      }
    }, true);

    // Form-submit intent tracking (success events are fired inline in the handlers).
    document.addEventListener("submit", function (e) {
      try {
        var form = e.target;
        if (!form || !form.id) return;
        if (/register/i.test(form.id)) fire("funnel_signup_submit", {});
        else if (/login/i.test(form.id)) fire("funnel_login_submit", {});
        else if (/checkout/i.test(form.id)) fire("funnel_checkout_submit", {});
        else if (/newsletter|subscribe/i.test(form.id)) fire("funnel_newsletter_submit", {});
      } catch (err) {
        /* ignore */
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
