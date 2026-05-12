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

    const storedData = await new Promise(resolve => chrome.storage.local.get('aqtSettings', resolve));
    const settings = window.AQT.normalizeSettings(storedData.aqtSettings || {});
    const locatorModel = window.AQT.getFrameworkLocatorModel(selectors, settings);

    const basename = `bug-report-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
    const filename = `${basename}.md`;
    const screenshotFilename = `${basename}.png`;

    let screenshotDataUrl = null;
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'capture-screenshot' }, resolve);
        });
        if (response && response.dataUrl) screenshotDataUrl = response.dataUrl;
    } catch (e) {
        // screenshot unavailable
    }

    let screenshotBlob = null;
    let screenshotSection = '_(Screenshot not available)_';

    if (screenshotDataUrl) {
        const hasHighlight = bbox && bbox.width > 0 && bbox.height > 0;

        screenshotBlob = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const dpr = window.devicePixelRatio || 1;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                if (hasHighlight) {
                    ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
                    ctx.fillRect(bbox.x * dpr, bbox.y * dpr, bbox.width * dpr, bbox.height * dpr);
                    ctx.strokeStyle = 'rgba(220, 38, 38, 0.9)';
                    ctx.lineWidth = 2 * dpr;
                    ctx.strokeRect(bbox.x * dpr, bbox.y * dpr, bbox.width * dpr, bbox.height * dpr);
                }

                canvas.toBlob((blob) => resolve(blob), 'image/png');
            };
            img.onerror = () => resolve(null);
            img.src = screenshotDataUrl;
        });

        if (screenshotBlob) {
            screenshotSection = `![Screenshot](${screenshotFilename})`;
        }
    }

    const markdown = `# Bug Report

**URL:** ${pageUrl}
**Page title:** ${pageTitle}
**Timestamp:** ${timestamp}

<details>
<summary>Environment</summary>

**Browser:** ${browserInfo}

</details>

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

## Locator

**Framework:** ${locatorModel.frameworkTitle} · ${settings.language}

**Recommended:**
\`\`\`
${locatorModel.primary}
\`\`\`

**Raw selector:**
\`\`\`
${primarySelector}
\`\`\`

---

## Screenshot

${screenshotSection}

---

## Steps to Reproduce

1. Open: ${pageUrl}
2. Locate element: \`${primarySelector}\` (${elementTag}, ${strategy}, ${stability})
3. <!-- Add interaction steps here -->

## Actual Result

<!-- What happened -->

## Expected Result

<!-- What should happen -->`;

    return { markdown, filename, screenshotBlob, screenshotFilename };
};
