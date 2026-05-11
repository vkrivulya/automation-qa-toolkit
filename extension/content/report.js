window.AQT = window.AQT || {};

window.AQT.generateBugReport = async function (selectors) {
    const element = window.AQT.pickerState.lastPickedElement;
    const pageUrl = window.location.href;
    const pageTitle = document.title;
    const timestamp = new Date().toISOString();
    const browserInfo = navigator.userAgent;
    const elementTag = element ? element.tagName.toLowerCase() : '—';
    const elementRole = element ? (element.getAttribute('role') || '—') : '—';
    const elementText = element ? (element.innerText || '').trim().slice(0, 200) || '—' : '—';
    const bbox = element ? element.getBoundingClientRect() : null;
    const bboxStr = bbox ? `x:${Math.round(bbox.x)} y:${Math.round(bbox.y)} w:${Math.round(bbox.width)} h:${Math.round(bbox.height)}` : '—';

    const primarySelector = selectors.recommendedSelector || selectors.css || '—';
    const strategy = selectors.strategy || '—';
    const stability = selectors.stability || '—';

    let screenshotDataUrl = null;
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'capture-screenshot' }, resolve);
        });
        if (response && response.dataUrl) screenshotDataUrl = response.dataUrl;
    } catch (e) {
        // screenshot unavailable
    }

    let highlightedDataUrl = null;
    if (screenshotDataUrl && bbox && bbox.width > 0 && bbox.height > 0) {
        highlightedDataUrl = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const dpr = window.devicePixelRatio || 1;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
                ctx.fillRect(bbox.x * dpr, bbox.y * dpr, bbox.width * dpr, bbox.height * dpr);
                ctx.strokeStyle = 'rgba(220, 38, 38, 0.9)';
                ctx.lineWidth = 2 * dpr;
                ctx.strokeRect(bbox.x * dpr, bbox.y * dpr, bbox.width * dpr, bbox.height * dpr);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = screenshotDataUrl;
        });
    }

    const screenshotSection = highlightedDataUrl
        ? `<img src="${highlightedDataUrl}" width="800" alt="Screenshot with highlighted element" />`
        : screenshotDataUrl
            ? `<img src="${screenshotDataUrl}" width="800" alt="Screenshot" />`
            : '_(Screenshot not available)_';

    const markdown = `# Bug Report

**URL:** ${pageUrl}
**Page title:** ${pageTitle}
**Timestamp:** ${timestamp}
**Browser:** ${browserInfo}

---

## Element Under Test

| Field | Value |
|---|---|
| Tag | ${elementTag} |
| Role | ${elementRole} |
| Text | ${elementText} |
| Bounding box | ${bboxStr} |
| Selector | \`${primarySelector}\` |
| Strategy | ${strategy} |
| Stability | ${stability} |

---

## Screenshot

${screenshotSection}

---

## Steps to Reproduce

1. <!-- Fill in steps -->

## Expected Behavior

<!-- Describe expected behavior -->

## Actual Behavior

<!-- Describe actual behavior -->`;

    const filename = `bug-report-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.md`;
    return { markdown, filename };
};
