window.AQT = window.AQT || {};

window.AQT.escapeCssValue = function (value) {
    if (value == null) return "";

    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll('"', '\\"');
};

window.AQT.escapeXPathValue = function (value) {
    if (value == null) return "";

    return String(value).replaceAll('"', "\\\"");
};

window.AQT.escapeJsSingleQuoteValue = function (value) {
    if (value == null) return "";

    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
};

window.AQT.toClassSelector = function (className) {
    if (!className) return "";

    const firstClass = String(className)
        .trim()
        .split(/\s+/)
        .find(Boolean);

    if (!firstClass) return "";

    return `.${window.AQT.escapeCssValue(firstClass)}`;
};

window.AQT.getBestTarget = function (element) {
    const clickableTags = ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"];

    let current = element;

    while (current && current !== document.body) {
        if (clickableTags.includes(current.tagName)) {
            return current;
        }

        if (
            current.getAttribute &&
            (
                current.getAttribute("data-e2e") ||
                current.getAttribute("data-testid") ||
                current.getAttribute("data-test") ||
                current.id ||
                current.getAttribute("name")
            )
        ) {
            return current;
        }

        current = current.parentElement;
    }

    return element;
};

window.AQT.buildElementInfo = function (element) {
    return {
        tag: element.tagName,
        id: element.id,
        classes: element.className,
        text: element.innerText,
        dataE2e: element.getAttribute("data-e2e"),
        dataTest: element.getAttribute("data-test"),
        dataTestId: element.getAttribute("data-testid"),
        name: element.getAttribute("name")
    };
};

window.AQT.generateSelectors = function (elementInfo) {
    let css = "";
    let xpath = "";
    let selenide = "";
    let playwright = "";
    let strategy = "";

    const tag = elementInfo.tag ? elementInfo.tag.toLowerCase() : "*";
    const cssDataE2e = window.AQT.escapeCssValue(elementInfo.dataE2e);
    const cssDataTestId = window.AQT.escapeCssValue(elementInfo.dataTestId);
    const cssDataTest = window.AQT.escapeCssValue(elementInfo.dataTest);
    const cssId = window.AQT.escapeCssValue(elementInfo.id);
    const cssName = window.AQT.escapeCssValue(elementInfo.name);

    const xpathDataE2e = window.AQT.escapeXPathValue(elementInfo.dataE2e);
    const xpathDataTestId = window.AQT.escapeXPathValue(elementInfo.dataTestId);
    const xpathDataTest = window.AQT.escapeXPathValue(elementInfo.dataTest);
    const xpathId = window.AQT.escapeXPathValue(elementInfo.id);
    const xpathName = window.AQT.escapeXPathValue(elementInfo.name);

    const jsDataE2e = window.AQT.escapeJsSingleQuoteValue(elementInfo.dataE2e);
    const jsDataTestId = window.AQT.escapeJsSingleQuoteValue(elementInfo.dataTestId);
    const jsDataTest = window.AQT.escapeJsSingleQuoteValue(elementInfo.dataTest);
    const jsId = window.AQT.escapeJsSingleQuoteValue(elementInfo.id);
    const jsName = window.AQT.escapeJsSingleQuoteValue(elementInfo.name);

    if (elementInfo.dataE2e) {
        css = `[data-e2e="${cssDataE2e}"]`;
        xpath = `//${tag}[@data-e2e="${xpathDataE2e}"]`;
        selenide = `$("[data-e2e='${jsDataE2e}']")`;
        playwright = `page.locator('[data-e2e="${cssDataE2e}"]')`;
        strategy = "data-e2e";
    } else if (elementInfo.dataTestId) {
        css = `[data-testid="${cssDataTestId}"]`;
        xpath = `//${tag}[@data-testid="${xpathDataTestId}"]`;
        selenide = `$("[data-testid='${jsDataTestId}']")`;
        playwright = `page.locator('[data-testid="${cssDataTestId}"]')`;
        strategy = "data-testid";
    } else if (elementInfo.dataTest) {
        css = `[data-test="${cssDataTest}"]`;
        xpath = `//${tag}[@data-test="${xpathDataTest}"]`;
        selenide = `$("[data-test='${jsDataTest}']")`;
        playwright = `page.locator('[data-test="${cssDataTest}"]')`;
        strategy = "data-test";
    } else if (elementInfo.id) {
        css = `#${cssId}`;
        xpath = `//${tag}[@id="${xpathId}"]`;
        selenide = `$("#${jsId}")`;
        playwright = `page.locator('#${jsId}')`;
        strategy = "id";
    } else if (elementInfo.name) {
        css = `[name="${cssName}"]`;
        xpath = `//${tag}[@name="${xpathName}"]`;
        selenide = `$("[name='${jsName}']")`;
        playwright = `page.locator('[name="${cssName}"]')`;
        strategy = "name";
    } else if (elementInfo.classes) {
        const classSelector = window.AQT.toClassSelector(elementInfo.classes);

        css = classSelector || tag;
        xpath = `//${tag}`;
        selenide = `$("${window.AQT.escapeJsSingleQuoteValue(css)}")`;
        playwright = `page.locator('${window.AQT.escapeJsSingleQuoteValue(css)}')`;
        strategy = classSelector ? "class" : "tag";
    } else {
        css = tag;
        xpath = `//${tag}`;
        selenide = `$("${tag}")`;
        playwright = `page.locator('${tag}')`;
        strategy = "tag";
    }

    const allSelectorsText =
        `Strategy: ${strategy}
CSS: ${css}
XPath: ${xpath}
Selenide: ${selenide}
Playwright: ${playwright}`;

    return {
        strategy,
        css,
        xpath,
        selenide,
        playwright,
        allSelectorsText
    };
};
