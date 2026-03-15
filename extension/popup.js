const startPickerButton = document.getElementById("startPicker");
const resultContainer = document.getElementById("result");

startPickerButton.addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs[0]?.id) {
        return;
    }

    await chrome.tabs.sendMessage(tabs[0].id, { action: "start-picker" });

    window.close();
});

document.addEventListener("DOMContentLoaded", async () => {
    const data = await chrome.storage.local.get("lastSelectedElement");

    if (data.lastSelectedElement) {
        renderResult(data.lastSelectedElement);
    }
});

function getStabilityView(stability) {
    const normalized = String(stability || "weak").toLowerCase();

    if (normalized === "stable") {
        return { key: "stable", label: "Stable" };
    }

    if (normalized === "medium") {
        return { key: "medium", label: "Medium" };
    }

    return { key: "weak", label: "Weak" };
}

function getSelectorTitle(key) {
    const titles = {
        css: "CSS",
        xpath: "XPath",
        selenideCss: "Selenide CSS",
        selenideXpath: "Selenide XPath",
        playwright: "Playwright"
    };

    return titles[key] || key;
}

function renderSelectorRow(selectors, key, recommended) {
    const value = selectors[key] || "";
    const meta = selectors.selectorMeta?.[key];
    const stability = getStabilityView(meta?.stability);

    return `
      <div class="result-row ${recommended ? "result-row-recommended" : ""}">
        <div class="result-row-head">
            <span class="result-label">${recommended ? "Recommended · " : ""}${escapeHtml(getSelectorTitle(key))}</span>
            <span class="result-stability result-stability-${escapeHtml(stability.key)}">${escapeHtml(stability.label)}</span>
        </div>
        <div class="result-value">${escapeHtml(value)}</div>
        <button class="copy-button" data-copy="${escapeAttribute(value)}">Copy ${escapeHtml(getSelectorTitle(key))}</button>
      </div>
    `;
}

function renderResult(selectors) {
    const orderedKeys = selectors.orderedSelectorKeys || ["css", "xpath", "selenideCss", "selenideXpath", "playwright"];
    const recommendedKey = selectors.recommendedKey || orderedKeys[0] || "css";

    const rows = orderedKeys
        .map((key) => renderSelectorRow(selectors, key, key === recommendedKey))
        .join("");

    resultContainer.innerHTML = `
    <div class="result-card">
      <div class="result-row-head">
        <span class="result-label">Strategy</span>
        <div class="result-value-inline">${escapeHtml(selectors.strategy)}</div>
      </div>

      ${rows}

      <div class="result-row">
        <button class="copy-button" data-copy="${escapeAttribute(selectors.allSelectorsText)}">Copy All</button>
      </div>
    </div>
  `;

    attachCopyHandlers();
}

function attachCopyHandlers() {
    const copyButtons = document.querySelectorAll(".copy-button");

    copyButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            const textToCopy = button.getAttribute("data-copy");

            if (!textToCopy) {
                return;
            }

            await navigator.clipboard.writeText(textToCopy);

            const originalText = button.innerText;
            button.innerText = "Copied!";

            setTimeout(() => {
                button.innerText = originalText;
            }, 1200);
        });
    });
}

function escapeHtml(value) {
    if (value == null) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    if (value == null) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
