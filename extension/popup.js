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

function renderResult(selectors) {
    resultContainer.innerHTML = `
    <div class="result-card">
      <div class="result-row">
        <span class="result-label">Strategy</span>
        <div class="result-value">${escapeHtml(selectors.strategy)}</div>
      </div>

      <div class="result-row">
        <span class="result-label">CSS</span>
        <div class="result-value">${escapeHtml(selectors.css)}</div>
        <button class="copy-button" data-copy="${escapeAttribute(selectors.css)}">Copy CSS</button>
      </div>

      <div class="result-row">
        <span class="result-label">Selenide</span>
        <div class="result-value">${escapeHtml(selectors.selenide)}</div>
        <button class="copy-button" data-copy="${escapeAttribute(selectors.selenide)}">Copy Selenide</button>
      </div>

      <div class="result-row">
        <span class="result-label">Playwright</span>
        <div class="result-value">${escapeHtml(selectors.playwright)}</div>
        <button class="copy-button" data-copy="${escapeAttribute(selectors.playwright)}">Copy Playwright</button>
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