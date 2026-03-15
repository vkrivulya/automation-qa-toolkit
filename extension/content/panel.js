window.AQT = window.AQT || {};

window.AQT.getStabilityView = function (stability) {
    const normalized = String(stability || "weak").toLowerCase();

    if (normalized === "stable") return { key: "stable", label: "Stable" };
    if (normalized === "medium") return { key: "medium", label: "Medium" };

    return { key: "weak", label: "Weak" };
};

window.AQT.showToast = function (message) {
    const existingToast = document.getElementById("aqt-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.id = "aqt-toast";
    toast.className = "aqt-toast";
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.parentElement && toast.remove(), 2000);
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

window.AQT.renderFrameworkOptions = function (selectedFramework) {
    return Object.entries(window.AQT.frameworkConfig)
        .map(([key, config]) => `<option value="${key}" ${selectedFramework === key ? "selected" : ""}>${config.title}</option>`)
        .join("");
};

window.AQT.renderLanguageOptions = function (framework, selectedLanguage) {
    const config = window.AQT.frameworkConfig[framework] || window.AQT.frameworkConfig.selenide;

    return config.languages
        .map((language) => `<option value="${language}" ${language === selectedLanguage ? "selected" : ""}>${language}</option>`)
        .join("");
};

window.AQT.buildPanelContent = function (selectors, settings) {
    const escapeHtml = window.AQT.escapeHtml;
    const escapeAttribute = window.AQT.escapeAttribute;
    const model = window.AQT.getFrameworkLocatorModel(selectors, settings);
    const stability = window.AQT.getStabilityView(model.stability);

    const altHtml = model.alternatives
        .map((item) => `<div class="aqt-alt-item"><code>${escapeHtml(item)}</code><button class="aqt-panel-inline-copy" data-copy="${escapeAttribute(item)}">Copy</button></div>`)
        .join("");

    return `
    <div class="aqt-strategy-block">
      <div class="aqt-block-label">Framework</div>
      <div class="aqt-strategy-badge">${escapeHtml(model.frameworkTitle)} · ${escapeHtml(model.settings.language)}</div>
      <div class="aqt-stability-badge aqt-stability-${escapeHtml(stability.key)}">${escapeHtml(stability.label)}</div>
    </div>

    <div class="aqt-settings-grid">
      <label class="aqt-field">
        <span>Framework</span>
        <select id="aqt-framework-select">${window.AQT.renderFrameworkOptions(model.settings.framework)}</select>
      </label>
      <label class="aqt-field">
        <span>Language</span>
        <select id="aqt-language-select">${window.AQT.renderLanguageOptions(model.settings.framework, model.settings.language)}</select>
      </label>
    </div>

    <div class="aqt-panel-section aqt-panel-section-recommended">
      <div class="aqt-panel-section-title">Locator snippet (${escapeHtml(model.strategy)})</div>
      <div class="aqt-panel-code">${escapeHtml(model.primary)}</div>
      <button class="aqt-panel-inline-copy" data-copy="${escapeAttribute(model.primary)}">Copy locator</button>
    </div>

    ${altHtml ? `<details class="aqt-more-selectors"><summary>Alternative snippets</summary>${altHtml}</details>` : ""}

    <div class="aqt-panel-actions">
      <button id="aqt-pick-next" class="aqt-panel-copy">Pick another element</button>
    </div>
  `;
};

window.AQT.bindPanelEvents = function (panel, selectors) {
    const copyButtons = panel.querySelectorAll("[data-copy]");

    copyButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            const textToCopy = button.getAttribute("data-copy");
            if (!textToCopy) return;

            await navigator.clipboard.writeText(textToCopy);
            const old = button.textContent;
            button.textContent = "Copied!";
            setTimeout(() => {
                button.textContent = old;
            }, 1200);
        });
    });

    const pickNextButton = panel.querySelector("#aqt-pick-next");
    if (pickNextButton) {
        pickNextButton.addEventListener("click", () => {
            window.AQT.startPicker();
            window.AQT.showToast("Picker mode enabled. Click any element.");
        });
    }

    const frameworkSelect = panel.querySelector("#aqt-framework-select");
    const languageSelect = panel.querySelector("#aqt-language-select");

    if (frameworkSelect && languageSelect) {
        frameworkSelect.addEventListener("change", async () => {
            const framework = frameworkSelect.value;
            const language = (window.AQT.frameworkConfig[framework] || window.AQT.frameworkConfig.selenide).languages[0];
            await chrome.storage.local.set({ aqtSettings: { framework, language } });
            await window.AQT.showFloatingPanel(selectors);
        });

        languageSelect.addEventListener("change", async () => {
            const framework = frameworkSelect.value;
            const language = languageSelect.value;
            await chrome.storage.local.set({ aqtSettings: { framework, language } });
            await window.AQT.showFloatingPanel(selectors);
        });
    }
};

window.AQT.showFloatingPanel = async function (selectors) {
    const existingPanel = document.getElementById("aqt-floating-panel");
    if (existingPanel) existingPanel.remove();

    const stored = await chrome.storage.local.get("aqtSettings");
    const settings = window.AQT.normalizeSettings(stored.aqtSettings);

    const panel = document.createElement("div");
    panel.id = "aqt-floating-panel";
    panel.className = "aqt-floating-panel";

    panel.innerHTML = `
    <div id="aqt-panel-header" class="aqt-panel-header">
      <div>
        <div class="aqt-panel-title">Automation QA Toolkit</div>
        <div class="aqt-panel-subtitle">Framework locator mode</div>
      </div>
      <button id="aqt-close-panel" class="aqt-panel-close">×</button>
    </div>
    <div class="aqt-panel-body">${window.AQT.buildPanelContent(selectors, settings)}</div>
  `;

    document.body.appendChild(panel);

    const closeButton = panel.querySelector("#aqt-close-panel");
    if (closeButton) {
        closeButton.addEventListener("click", () => panel.remove());
    }

    window.AQT.enablePanelDrag(panel);
    window.AQT.bindPanelEvents(panel, selectors);
};
