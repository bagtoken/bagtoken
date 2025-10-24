<!-- /js/bag-quick-amounts.js -->
<script>
(function (global) {
  "use strict";

  // ===== Utilities =====
  const W = window;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $all = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const toFixed2 = (n) => (Number(n) || 0).toFixed(2);
  const floor6 = (n) => Math.floor((Number(n) || 0) * 1e6) / 1e6;

  function PRICES() {
    return W.__PRICES__ || { bagUsd: 0, xrpUsd: 0 };
  }
  function getCurrentCurrency(toggleEl) {
    try {
      const el = toggleEl?.querySelector('input[name="betCur"]:checked');
      return el ? String(el.value).toUpperCase() : "XRP";
    } catch {
      return "XRP";
    }
  }
  function convertUsdToQty(usd, ccy) {
    const { bagUsd, xrpUsd } = PRICES();
    if (!(usd > 0)) return 0;
    if (ccy === "BAG") return bagUsd > 0 ? usd / bagUsd : 0;
    return xrpUsd > 0 ? usd / xrpUsd : 0; // XRP
  }
  function parseUsdAttr(v, maxUsd) {
    const s = String(v || "").trim().toLowerCase();
    if (s === "max") return Number(maxUsd) || 0;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function clearActive(container, activeClass) {
    $all(`[data-usd].${activeClass}`, container).forEach((b) =>
      b.classList.remove(activeClass)
    );
  }
  function dispatchInputChange(el) {
    // Ensures any game-specific listeners (limits, HUD, etc.) react
    try {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
  }

  // ===== Mount one container =====
  function mount(container, opts = {}) {
    if (!container) return;

    const cfg = {
      targetUsdSel: container.dataset.targetUsd || opts.targetUsd || "#usdBet",
      targetQtySel: container.dataset.targetQty || opts.targetQty || "#betQty",
      currencyToggleSel:
        container.dataset.currencyToggle || opts.currencyToggle || "#curToggle",
      minUsd: Number(container.dataset.minUsd || opts.minUsd || 1),
      maxUsd: Number(container.dataset.maxUsd || opts.maxUsd || 2000),
      activeClass: container.dataset.activeClass || opts.activeClass || "active",
      syncOnPrice:
        (container.dataset.syncOnPrice ?? String(opts.syncOnPrice ?? "1")) !==
        "0",
    };

    const targetUsd = $(cfg.targetUsdSel);
    const targetQty = $(cfg.targetQtySel);
    const curToggle = $(cfg.currencyToggleSel);

    if (!targetUsd) {
      console.warn(
        "[bag-quick-amounts] target USD input not found:",
        cfg.targetUsdSel
      );
    }
    if (!targetQty) {
      console.warn(
        "[bag-quick-amounts] target quantity input not found:",
        cfg.targetQtySel
      );
    }

    function setFromUsd(usdVal) {
      const u = clamp(Number(usdVal) || 0, 0, cfg.maxUsd);

      if (targetUsd) {
        targetUsd.value = u ? toFixed2(u) : "";
        targetUsd.dataset.userTyped = u ? "1" : "0";
        dispatchInputChange(targetUsd);
      }
      if (targetQty) {
        const ccy = getCurrentCurrency(curToggle);
        const qty = convertUsdToQty(u, ccy);
        targetQty.value = u > 0 ? String(floor6(qty)) : "";
        dispatchInputChange(targetQty);
      }

      // Let HUDs and other components refresh
      W.dispatchEvent(new CustomEvent("bag:hudRefresh"));
    }

    function recalcQtyFromUsdIfAny() {
      if (!targetUsd || !targetQty) return;
      const usdNow = Number(targetUsd.value);
      if (!(usdNow > 0)) return;
      const ccy = getCurrentCurrency(curToggle);
      const qty = convertUsdToQty(usdNow, ccy);
      targetQty.value = String(floor6(qty));
      dispatchInputChange(targetQty);
      W.dispatchEvent(new CustomEvent("bag:hudRefresh"));
    }

    // Click → set USD and derived qty, set active state
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-usd]");
      if (!btn || !container.contains(btn)) return;

      clearActive(container, cfg.activeClass);
      btn.classList.add(cfg.activeClass);

      const raw = btn.getAttribute("data-usd");
      const usdVal = parseUsdAttr(raw, cfg.maxUsd);
      const clamped = clamp(usdVal, 0, cfg.maxUsd);

      if (clamped > 0 && clamped < cfg.minUsd) {
        // Non-blocking heads-up hook
        W.dispatchEvent(
          new CustomEvent("bag:qa:minWarning", {
            detail: { minUsd: cfg.minUsd, value: clamped },
          })
        );
      }

      setFromUsd(clamped);

      // Optional analytics hook
      W.dispatchEvent(
        new CustomEvent("bag:quickAmount", { detail: { container, usd: clamped } })
      );
    });

    // Manual edits clear chip active state
    if (targetUsd) {
      targetUsd.addEventListener("input", () => {
        clearActive(container, cfg.activeClass);
        targetUsd.dataset.userTyped =
          targetUsd.value && targetUsd.value.length ? "1" : "0";
      });
    }
    if (targetQty) {
      targetQty.addEventListener("input", () => {
        clearActive(container, cfg.activeClass);
      });
    }

    // Currency tab change → keep USD fixed, recompute qty
    if (curToggle) {
      curToggle.addEventListener("change", () => recalcQtyFromUsdIfAny());
    }

    // Live prices → keep USD fixed, recompute qty (configurable)
    if (cfg.syncOnPrice) {
      W.addEventListener("bag:pricesUpdated", recalcQtyFromUsdIfAny);
    }

    // Initial gentle sync if USD already has a value
    recalcQtyFromUsdIfAny();

    // Public instance API (optional)
    return {
      setFromUsd,
      recalcQtyFromUsdIfAny,
      destroy() {
        // Intentionally empty (lightweight)
      },
    };
  }

  // Mount all containers with the data-attribute
  function mountAll(root = document) {
    const containers = $all("[data-quick-amounts]", root);
    containers.forEach((el) => mount(el));
  }

  // Export + auto-mount on DOM ready
  const API = { mount, mountAll, convertUsdToQty, getCurrentCurrency };
  global.BAGQuickAmounts = API;
  document.addEventListener("DOMContentLoaded", () => mountAll());
})(window);
</script>
