window.AQT = window.AQT || {};

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

window.AQT.escapeCssValue = function (value) {
    if (value == null) return "";

    if (typeof CSS !== "undefined" && CSS.escape) {
        return CSS.escape(String(value));
    }

    return String(value).replace(/(["'\\\]\[])/g, "\\$1");
};

window.AQT.escapeXpathValue = function (value) {
    if (value == null) return "''";

    const stringValue = String(value);

    if (!stringValue.includes("\"")) {
        return `"${stringValue}"`;
    }

    if (!stringValue.includes("'")) {
        return `'${stringValue}'`;
    }

    const parts = stringValue.split("\"");
    const escapedParts = parts.map((part) => `"${part}"`).join(', "\\\"", ');

    return `concat(${escapedParts})`;
};

window.AQT.escapeJsSingleQuotedString = function (value) {
    if (value == null) return "";

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
};

window.AQT.normalizeText = function (value) {
    if (value == null) return "";

    return String(value)
        .replace(/\s+/g, " ")
        .trim();
};

window.AQT.isLikelyGeneratedClass = function (className) {
    if (!className) return true;

    if (/^ng-|^css-|^jsx-|^sc-/.test(className)) {
        return true;
    }

    return (
        /__[a-z0-9]+_[a-z0-9]+/i.test(className) ||
        /_[a-z0-9]{4,}_[0-9]+$/i.test(className) ||
        /-[a-z0-9]{6,}$/i.test(className) ||
        /[0-9]{3,}/.test(className)
    );
};

window.AQT.getUniqueClassSelector = function (element, tag) {
    if (!element || !element.classList || !element.classList.length) {
        return "";
    }

    const classNames = Array.from(element.classList)
        .filter((className) => className && !window.AQT.isLikelyGeneratedClass(className));

    for (const className of classNames) {
        const selector = `${tag}.${window.AQT.escapeCssValue(className)}`;

        if (document.querySelectorAll(selector).length === 1) {
            return selector;
        }
    }

    if (classNames.length > 1) {
        const selector = `${tag}.${classNames
            .map((className) => window.AQT.escapeCssValue(className))
            .join(".")}`;

        if (document.querySelectorAll(selector).length === 1) {
            return selector;
        }
    }

    return "";
};

window.AQT.getTextBasedSelectors = function (element, tag) {
    if (!element) return null;

    const text = window.AQT.normalizeText(element.innerText || element.textContent);

    if (!text || text.length < 2 || text.length > 80) {
        return null;
    }

    const candidates = Array.from(document.querySelectorAll(tag))
        .filter((node) => window.AQT.normalizeText(node.innerText || node.textContent) === text);

    if (candidates.length !== 1) {
        return null;
    }

    const escapedTextForXpath = window.AQT.escapeXpathValue(text);
    const escapedTextForJs = window.AQT.escapeJsSingleQuotedString(text);
    const xpath = `//${tag}[normalize-space(.)=${escapedTextForXpath}]`;

    let playwright = `page.getByText('${escapedTextForJs}', { exact: true })`;

    if (tag === "button") {
        playwright = `page.getByRole('button', { name: '${escapedTextForJs}', exact: true })`;
    } else if (tag === "a") {
        playwright = `page.getByRole('link', { name: '${escapedTextForJs}', exact: true })`;
    }

    return {
        css: window.AQT.getIndexedCssSelector(element, tag),
        xpath,
        selenide: `$x("${xpath}")`,
        playwright,
        strategy: "text",
        stability: "🟡 Medium"
    };
};

window.AQT.getIndexedCssSelector = function (element, tag) {
    if (!element || !element.parentElement) {
        return tag;
    }

    const siblings = Array.from(element.parentElement.children)
        .filter((sibling) => sibling.tagName.toLowerCase() === tag);

    if (siblings.length <= 1) {
        return tag;
    }

    const index = siblings.indexOf(element) + 1;

    return `${tag}:nth-of-type(${index})`;
};


window.AQT.getIndexedXpath = function (element, tag) {
    if (!element || !element.parentElement) {
        return `//${tag}`;
    }

    const siblings = Array.from(element.parentElement.children)
        .filter((sibling) => sibling.tagName.toLowerCase() === tag);

    if (siblings.length <= 1) {
        return `//${tag}`;
    }

    const index = siblings.indexOf(element) + 1;

    return `(//${tag})[${index}]`;
};

window.AQT.generateSelectors = function (elementInfo, element) {
    let css = "";
    let xpath = "";
    let selenide = "";
    let playwright = "";
    let strategy = "";
    let stability = "";

    const tag = elementInfo.tag ? elementInfo.tag.toLowerCase() : "*";

    if (elementInfo.dataE2e) {
        const escaped = window.AQT.escapeCssValue(elementInfo.dataE2e);
        const escapedXpath = window.AQT.escapeXpathValue(elementInfo.dataE2e);

        css = `[data-e2e="${escaped}"]`;
        xpath = `//${tag}[@data-e2e=${escapedXpath}]`;
        selenide = `$("[data-e2e='${elementInfo.dataE2e}']")`;
        playwright = `page.locator('[data-e2e="${elementInfo.dataE2e}"]')`;
        strategy = "data-e2e";
        stability = "🟢 Stable";
    } else if (elementInfo.dataTestId) {
        const escaped = window.AQT.escapeCssValue(elementInfo.dataTestId);
        const escapedXpath = window.AQT.escapeXpathValue(elementInfo.dataTestId);

        css = `[data-testid="${escaped}"]`;
        xpath = `//${tag}[@data-testid=${escapedXpath}]`;
        selenide = `$("[data-testid='${elementInfo.dataTestId}']")`;
        playwright = `page.locator('[data-testid="${elementInfo.dataTestId}"]')`;
        strategy = "data-testid";
        stability = "🟢 Stable";
    } else if (elementInfo.dataTest) {
        const escaped = window.AQT.escapeCssValue(elementInfo.dataTest);
        const escapedXpath = window.AQT.escapeXpathValue(elementInfo.dataTest);

        css = `[data-test="${escaped}"]`;
        xpath = `//${tag}[@data-test=${escapedXpath}]`;
        selenide = `$("[data-test='${elementInfo.dataTest}']")`;
        playwright = `page.locator('[data-test="${elementInfo.dataTest}"]')`;
        strategy = "data-test";
        stability = "🟢 Stable";
    } else if (elementInfo.id) {
        const escapedId = window.AQT.escapeCssValue(elementInfo.id);
        const escapedXpath = window.AQT.escapeXpathValue(elementInfo.id);

        css = `#${escapedId}`;
        xpath = `//${tag}[@id=${escapedXpath}]`;
        selenide = `$("#${elementInfo.id}")`;
        playwright = `page.locator('#${elementInfo.id}')`;
        strategy = "id";
        stability = "🟢 Stable";
    } else if (elementInfo.name) {
        const escapedName = window.AQT.escapeCssValue(elementInfo.name);
        const escapedXpath = window.AQT.escapeXpathValue(elementInfo.name);

        css = `[name="${escapedName}"]`;
        xpath = `//${tag}[@name=${escapedXpath}]`;
        selenide = `$("[name='${elementInfo.name}']")`;
        playwright = `page.locator('[name="${elementInfo.name}"]')`;
        strategy = "name";
        stability = "🟡 Medium";
    } else {
        const textBasedSelectors = window.AQT.getTextBasedSelectors(element, tag);

        if (textBasedSelectors) {
            css = textBasedSelectors.css;
            xpath = textBasedSelectors.xpath;
            selenide = textBasedSelectors.selenide;
            playwright = textBasedSelectors.playwright;
            strategy = textBasedSelectors.strategy;
            stability = textBasedSelectors.stability;
        } else {
            const uniqueClassSelector = window.AQT.getUniqueClassSelector(element, tag);

            if (uniqueClassSelector) {
                css = uniqueClassSelector;
                const classNames = uniqueClassSelector.split(".").slice(1);
                const classPredicate = classNames
                    .map((className) => `contains(concat(" ", normalize-space(@class), " "), ${window.AQT.escapeXpathValue(` ${className} `)})`)
                    .join(" and ");
                xpath = `//${tag}[${classPredicate}]`;
                selenide = `$("${uniqueClassSelector}")`;
                playwright = `page.locator('${uniqueClassSelector}')`;
                strategy = "class";
                stability = "🟡 Medium";
            } else {
                css = window.AQT.getIndexedCssSelector(element, tag);
                xpath = window.AQT.getIndexedXpath(element, tag);
                selenide = `$("${css}")`;
                playwright = `page.locator('${css}')`;
                strategy = "tag+nth";
                stability = "🔴 Weak";
            }
        }
    }

    const allSelectorsText =
        `Strategy: ${strategy}
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
