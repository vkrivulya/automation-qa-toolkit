window.AQT = window.AQT || {};

window.AQT.escapeCssString = function (value) {
    if (value == null) return "";

    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll('"', '\\"')
        .replaceAll("\n", "\\a ")
        .replaceAll("\r", "\\d ");
};

window.AQT.escapeCssIdentifier = function (value) {
    if (value == null) return "";

    const stringValue = String(value);

    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(stringValue);
    }

    return stringValue.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
};

window.AQT.toXPathLiteral = function (value) {
    if (value == null) return '""';

    const stringValue = String(value);

    if (!stringValue.includes('"')) {
        return `"${stringValue}"`;
    }

    if (!stringValue.includes("'")) {
        return `'${stringValue}'`;
    }

    const parts = stringValue.split('"');
    const xpathParts = [];

    parts.forEach((part, index) => {
        if (part) {
            xpathParts.push(`"${part}"`);
        }

        if (index < parts.length - 1) {
            xpathParts.push("'\"'");
        }
    });

    if (xpathParts.length === 0) {
        return '""';
    }

    return `concat(${xpathParts.join(", ")})`;
};

window.AQT.escapeJsSingleQuoteValue = function (value) {
    if (value == null) return "";

    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "\\r");
};

window.AQT.getFirstClassToken = function (className) {
    if (!className) return "";

    return String(className)
        .trim()
        .split(/\s+/)
        .find(Boolean) || "";
};

window.AQT.toClassSelector = function (className) {
    const firstClass = window.AQT.getFirstClassToken(className);

    if (!firstClass) return "";

    return `.${window.AQT.escapeCssIdentifier(firstClass)}`;
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

window.AQT.getSelectorStability = function (strategy) {
    const map = {
        "data-e2e": "high",
        "data-testid": "high",
        "data-test": "high",
        "id": "medium",
        "name": "medium",
        "class": "low",
        "tag": "low"
    };

    return map[strategy] || "low";
};

window.AQT.buildSelectorsResult = function (strategy, css, xpath) {
    const jsCss = window.AQT.escapeJsSingleQuoteValue(css);

    const selenide = `$('${jsCss}')`;
    const playwright = `page.locator('${jsCss}')`;

    const stability = window.AQT.getSelectorStability(strategy);

    const allSelectorsText =
        `Strategy: ${strategy}
Stability: ${stability}
CSS: ${css}
XPath: ${xpath}
Selenide: ${selenide}
Playwright: ${playwright}`;

    return {
        strategy,
        stability,
        css,
        xpath,
        selenide,
        playwright,
        allSelectorsText
    };
};

window.AQT.generateSelectors = function (elementInfo) {
    const tag = elementInfo.tag ? elementInfo.tag.toLowerCase() : "*";

    if (elementInfo.dataE2e) {
        const css = `[data-e2e="${window.AQT.escapeCssString(elementInfo.dataE2e)}"]`;
        const xpath = `//${tag}[@data-e2e=${window.AQT.toXPathLiteral(elementInfo.dataE2e)}]`;

        return window.AQT.buildSelectorsResult("data-e2e", css, xpath);
    }

    if (elementInfo.dataTestId) {
        const css = `[data-testid="${window.AQT.escapeCssString(elementInfo.dataTestId)}"]`;
        const xpath = `//${tag}[@data-testid=${window.AQT.toXPathLiteral(elementInfo.dataTestId)}]`;

        return window.AQT.buildSelectorsResult("data-testid", css, xpath);
    }

    if (elementInfo.dataTest) {
        const css = `[data-test="${window.AQT.escapeCssString(elementInfo.dataTest)}"]`;
        const xpath = `//${tag}[@data-test=${window.AQT.toXPathLiteral(elementInfo.dataTest)}]`;

        return window.AQT.buildSelectorsResult("data-test", css, xpath);
    }

    if (elementInfo.id) {
        const css = `#${window.AQT.escapeCssIdentifier(elementInfo.id)}`;
        const xpath = `//${tag}[@id=${window.AQT.toXPathLiteral(elementInfo.id)}]`;

        return window.AQT.buildSelectorsResult("id", css, xpath);
    }

    if (elementInfo.name) {
        const css = `[name="${window.AQT.escapeCssString(elementInfo.name)}"]`;
        const xpath = `//${tag}[@name=${window.AQT.toXPathLiteral(elementInfo.name)}]`;

        return window.AQT.buildSelectorsResult("name", css, xpath);
    }

    const firstClass = window.AQT.getFirstClassToken(elementInfo.classes);
    const classSelector = window.AQT.toClassSelector(elementInfo.classes);

    if (classSelector && firstClass) {
        const xpath = `//${tag}[contains(concat(' ', normalize-space(@class), ' '), ${window.AQT.toXPathLiteral(` ${firstClass} `)})]`;

        return window.AQT.buildSelectorsResult("class", classSelector, xpath);
    }

    const css = tag;
    const xpath = `//${tag}`;

    return window.AQT.buildSelectorsResult("tag", css, xpath);
};
