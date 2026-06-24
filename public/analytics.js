/**
 * Trailmark lightweight analytics tracker.
 *
 * Drop into any page with a single tag:
 *   <script src="/analytics.js"></script>
 *
 * Optional: override the backend with a data-api-url attribute on the tag:
 *   <script src="/analytics.js" data-api-url="https://your-app.vercel.app"></script>
 *
 * Tracks: one page_view on load, and every click (document-relative coords).
 * Delivery is batched + reliable (queue flush + sendBeacon on unload).
 */
(function () {
  "use strict";

  // ----- Config ---------------------------------------------------------------
  var SESSION_KEY = "cf_session_id";
  var ACTIVITY_KEY = "cf_last_activity";
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30-minute inactivity window
  var FLUSH_EVERY = 5; // flush when queue reaches this many events
  var FLUSH_INTERVAL_MS = 4000; // ...or at least this often

  // Resolve the API endpoint. Default to same-origin /api/events.
  function resolveEndpoint() {
    var current =
      document.currentScript ||
      (function () {
        var s = document.getElementsByTagName("script");
        return s[s.length - 1];
      })();
    var override = current && current.getAttribute("data-api-url");
    var base = override ? override.replace(/\/$/, "") : "";
    return base + "/api/events";
  }
  var ENDPOINT = resolveEndpoint();

  // ----- Session management ---------------------------------------------------
  function uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // RFC4122-ish fallback for older browsers.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function safeSet(key, val) {
    try {
      window.localStorage.setItem(key, val);
    } catch (e) {
      /* private mode / disabled storage: fall through to in-memory id */
    }
  }

  var memorySessionId = null; // fallback if localStorage is unavailable

  function getSessionId() {
    var now = Date.now();
    var stored = safeGet(SESSION_KEY) || memorySessionId;
    var lastActivity = parseInt(safeGet(ACTIVITY_KEY) || "0", 10);

    var expired = !lastActivity || now - lastActivity > SESSION_TIMEOUT_MS;
    if (!stored || expired) {
      stored = uuid();
      memorySessionId = stored;
      safeSet(SESSION_KEY, stored);
    }
    safeSet(ACTIVITY_KEY, String(now));
    return stored;
  }

  // ----- Queue + delivery -----------------------------------------------------
  var queue = [];

  function enqueue(event) {
    queue.push(event);
    if (queue.length >= FLUSH_EVERY) flush(false);
  }

  function flush(useBeacon) {
    if (queue.length === 0) return;
    var batch = queue.splice(0, queue.length);
    var payload = JSON.stringify(batch);

    // On page hide / unload, sendBeacon is the only reliable transport.
    if (useBeacon && navigator.sendBeacon) {
      var blob = new Blob([payload], { type: "application/json" });
      var ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
      // If beacon was rejected, fall through to keepalive fetch.
    }

    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(function () {
        // Re-queue on network failure so the next flush retries.
        queue = batch.concat(queue);
      });
    } catch (e) {
      queue = batch.concat(queue);
    }
  }

  // ----- Event capture --------------------------------------------------------
  function track(type, extra) {
    var event = {
      sessionId: getSessionId(),
      type: type,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) event[k] = extra[k];
      }
    }
    enqueue(event);
  }

  function trackClick(e) {
    var docEl = document.documentElement;
    track("click", {
      // pageX/pageY are document-relative: survive scrolling and resizing.
      pageX: Math.round(e.pageX),
      pageY: Math.round(e.pageY),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageWidth: docEl.scrollWidth,
      pageHeight: docEl.scrollHeight,
    });
  }

  // ----- Wire up --------------------------------------------------------------
  // Single delegated listener for all clicks (capture phase so it always fires).
  document.addEventListener("click", trackClick, true);

  // Periodic flush.
  setInterval(function () {
    flush(false);
  }, FLUSH_INTERVAL_MS);

  // Reliable flush when the tab is hidden or being unloaded.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", function () {
    flush(true);
  });

  // Fire the initial page_view.
  track("page_view");

  // Expose a tiny manual API for debugging / custom events.
  window.CFAnalytics = {
    track: track,
    flush: function () {
      flush(false);
    },
    getSessionId: getSessionId,
  };
})();
