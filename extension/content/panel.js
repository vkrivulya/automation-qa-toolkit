window.AQT = window.AQT || {};

window.AQT.showToast = function (message) {
    const existingToast = document.getElementById("aqt-toast");

    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = "aqt-toast";
    toast.innerText = message;

    toast.style.position = "fixed";
    toast.style.top = "24px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = "linear-gradient(135deg, #22c55e, #16a34a)";
    toast.style.color = "#ffffff";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "12px";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "600";
    toast.style.zIndex = "999999";
    toast.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.25)";
    toast.style.border = "1px solid rgba(255,255,255,0.2)";
    toast.style.minWidth = "220px";
    toast.style.textAlign = "center";

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 2000);
};

window.AQT.buildPanelSection = function (title, value, buttonText) {
    const escapeHtml = window.AQT.escapeHtml;
    const escapeAttribute = window.AQT.escapeAttribute;

    return `
    <div style="margin-bottom: 16px;">
      <div style="font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 6px;">
        ${escapeHtml(title)}
      </div>

      <div style="
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 10px 12px;
        font-family: monospace;
        font-size: 13px;
        color: #111827;
        word-break: break-word;
      ">
        ${escapeHtml(value)}
      </div>

      <button
        data-copy="${escapeAttribute(value)}"
        style="
          margin-top: 8px;
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 10px 12px;
          background: #111827;
          color: white;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        "
      >
        ${escapeHtml(buttonText)}
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

    const buildPanelSection = window.AQT.buildPanelSection;
    const escapeHtml = window.AQT.escapeHtml;

    const panel = document.createElement("div");
    panel.id = "aqt-floating-panel";

    panel.style.position = "fixed";
    panel.style.top = "80px";
    panel.style.right = "24px";
    panel.style.width = "360px";
    panel.style.maxHeight = "80vh";
    panel.style.overflowY = "auto";
    panel.style.background = "#ffffff";
    panel.style.border = "1px solid #e5e7eb";
    panel.style.borderRadius = "16px";
    panel.style.boxShadow = "0 20px 50px rgba(0,0,0,0.22)";
    panel.style.zIndex = "999999";
    panel.style.fontFamily = "Arial, sans-serif";
    panel.style.padding = "0";
    panel.style.color = "#111827";

    const panelTemplate = `
    <div id="aqt-panel-header" style="
      padding: 16px 18px;
      background: linear-gradient(135deg, #111827, #1f2937);
      color: white;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
    ">
      <div>
        <div style="font-size: 16px; font-weight: 700;">Automation QA Toolkit</div>
        <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Selector Generator</div>
      </div>

      <button id="aqt-close-panel" style="
        background: rgba(255,255,255,0.14);
        color: white;
        border: none;
        border-radius: 10px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        font-size: 16px;
      ">×</button>
    </div>

    <div style="padding: 16px;">
      <div style="margin-bottom: 14px;">
        <div style="font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 6px;">STRATEGY</div>
        <div style="
          display: inline-block;
          background: #dcfce7;
          color: #166534;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        ">${escapeHtml(selectors.strategy)}</div>
      </div>

      ${buildPanelSection("CSS", selectors.css, "Copy CSS")}
      ${buildPanelSection("Selenide", selectors.selenide, "Copy Selenide")}
      ${buildPanelSection("Playwright", selectors.playwright, "Copy Playwright")}
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