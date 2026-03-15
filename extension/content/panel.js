window.AQT = window.AQT || {};

window.AQT.getStabilityView = function (stability) {
    const normalized = String(stability || "weak").toLowerCase();

    if (normalized === "stable") {
        return { key: "stable", label: "Stable" };
    }

    if (normalized === "medium") {
        return { key: "medium", label: "Medium" };
    }

    return { key: "weak", label: "Weak" };
};

window.AQT.getSelectorTitle = function (key) {
    const titles = {
        css: "CSS",
        xpath: "XPath",
        selenideCss: "Selenide CSS",
        selenideXpath: "Selenide XPath",
        playwright: "Playwright"
    };

    return titles[key] || key;
};

window.AQT.showToast = function (message) {
    const existingToast = document.getElementById("aqt-toast");

    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = "aqt-toast";
    toast.className = "aqt-toast";
    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 2000);
};

window.AQT.buildPanelSection = function (key, selectors, isRecommended) {
    const escapeHtml = window.AQT.escapeHtml;
    const escapeAttribute = window.AQT.escapeAttribute;
    const title = window.AQT.getSelectorTitle(key);
    const value = selectors[key] || "";
    const meta = selectors.selectorMeta?.[key];
    const stabilityView = window.AQT.getStabilityView(meta?.stability);

    return `
    <div class="aqt-panel-section ${isRecommended ? "aqt-panel-section-recommended" : ""}">
      <div class="aqt-panel-section-title-row">
        <div class="aqt-panel-section-title-wrap">
          <div class="aqt-panel-section-title">
            ${isRecommended ? "Recommended · " : ""}${escapeHtml(title)}
          </div>
          ${isRecommended ? `<div class="aqt-panel-section-hint">Best strategy: ${escapeHtml(selectors.strategy)}</div>` : ""}
        </div>
        <div class="aqt-stability-badge aqt-stability-${escapeHtml(stabilityView.key)}">
          ${escapeHtml(stabilityView.label)}
        </div>
      </div>

      <div class="aqt-panel-code">
        ${escapeHtml(value)}
      </div>

      <button
        class="aqt-panel-inline-copy"
        data-copy="${escapeAttribute(value)}"
      >
        Copy
      </button>
    </div>
  `;
};

window.AQT.enablePanelDrag = function (panel) {
    const header = panel.querySelector("#aqt-panel-header");

    if (!header) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener("mousedown", (event) => {
        isDragging = true;

        const rect = panel.getBoundingClientRect();

        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;

        panel.style.left = rect.left + "px";
        panel.style.top = rect.top + "px";
        panel.style.right = "auto";

        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (event) => {
        if (!isDragging) return;

        let newLeft = event.clientX - offsetX;
        let newTop = event.clientY - offsetY;

        const maxLeft = window.innerWidth - panel.offsetWidth;
        const maxTop = window.innerHeight - panel.offsetHeight;

        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft > maxLeft) newLeft = maxLeft;
        if (newTop > maxTop) newTop = maxTop;

        panel.style.left = newLeft + "px";
        panel.style.top = newTop + "px";
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        document.body.style.userSelect = "";
    });
};

window.AQT.showFloatingPanel = function (selectors) {
    const existingPanel = document.getElementById("aqt-floating-panel");

    if (existingPanel) {
        existingPanel.remove();
    }

    const escapeHtml = window.AQT.escapeHtml;
    const orderedKeys = selectors.orderedSelectorKeys || ["css", "xpath", "selenideCss", "selenideXpath", "playwright"];
    const recommendedKey = selectors.recommendedKey || orderedKeys[0] || "css";

    const recommendedSection = window.AQT.buildPanelSection(recommendedKey, selectors, true);
    const otherSections = orderedKeys
        .filter((key) => key !== recommendedKey)
        .map((key) => window.AQT.buildPanelSection(key, selectors, false))
        .join("");

    const panel = document.createElement("div");
    panel.id = "aqt-floating-panel";
    panel.className = "aqt-floating-panel";

    const panelTemplate = `
    <div id="aqt-panel-header" class="aqt-panel-header">
      <div>
        <div class="aqt-panel-title">Automation QA Toolkit</div>
        <div class="aqt-panel-subtitle">Selector Generator</div>
      </div>

      <button id="aqt-close-panel" class="aqt-panel-close">×</button>
    </div>

    <div class="aqt-panel-body">
      <div class="aqt-strategy-block">
        <div class="aqt-block-label">STRATEGY</div>
        <div class="aqt-strategy-badge">${escapeHtml(selectors.strategy)}</div>
      </div>

      ${recommendedSection}

      <details class="aqt-more-selectors" open>
        <summary>Other selectors</summary>
        ${otherSections}
      </details>

      <button
        class="aqt-panel-copy"
        data-copy="${window.AQT.escapeAttribute(selectors.allSelectorsText)}"
      >
        Copy All
      </button>
    </div>
  `;

    panel.innerHTML = panelTemplate;
    document.body.appendChild(panel);

    const closeButton = panel.querySelector("#aqt-close-panel");
    if (closeButton) {
        closeButton.addEventListener("click", () => {
            panel.remove();
        });
    }

    window.AQT.enablePanelDrag(panel);

    const copyButtons = panel.querySelectorAll("[data-copy]");
    copyButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            const textToCopy = button.getAttribute("data-copy");
            if (!textToCopy) return;

            await navigator.clipboard.writeText(textToCopy);

            const originalText = button.textContent;
            button.textContent = "Copied!";

            setTimeout(() => {
                button.textContent = originalText;
            }, 1200);
        });
    });
};
