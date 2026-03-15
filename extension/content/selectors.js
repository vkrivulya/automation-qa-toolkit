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

window.AQT.stabilityRank = function (stability) {
    const ranks = {
        stable: 3,
        medium: 2,
        weak: 1
    };

    return ranks[stability] || 1;
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


window.AQT.getClassContainsSelector = function (element, tag) {
    if (!element || !element.classList || !element.classList.length) {
        return "";
    }

    const fragmentSet = new Set();

    Array.from(element.classList).forEach((className) => {
        if (!className) return;

        const normalized = className
            .replace(/^_+|_+$/g, "")
            .replace(/[0-9]+/g, " ");

        const rawParts = normalized
            .split(/[^a-zA-Z]+/)
            .filter(Boolean);

        rawParts.forEach((part) => {
            const camelParts = part
                .split(/(?=[A-Z])/)
                .filter(Boolean);

            if (part.length >= 6) {
                fragmentSet.add(part);
            }

            camelParts.forEach((camelPart) => {
                if (camelPart.length >= 6) {
                    fragmentSet.add(camelPart);
                }
            });
        });
    });

    const fragments = Array.from(fragmentSet)
        .sort((a, b) => b.length - a.length);

    for (const fragment of fragments) {
        const escapedFragment = window.AQT.escapeCssValue(fragment);
        const selector = `${tag}[class*='${escapedFragment}']`;

        if (document.querySelectorAll(selector).length === 1) {
            return selector;
        }
    }

    return "";
};

window.AQT.getIndexedCssSelector = function (element, tag) {
    if (!element || !element.parentElement) {
        return tag;
    }

    const siblings = Array.from(element.parentElement.children)
        .filter((sibling) => sibling.tagName.toLowerCase() === tag);

    const index = siblings.indexOf(element) + 1;
    const parentTag = element.parentElement.tagName.toLowerCase();

    if (siblings.length <= 1) {
        return `${parentTag} > ${tag}`;
    }

    return `${parentTag} > ${tag}:nth-of-type(${index})`;
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
        xpath,
        selenide: `$x("${xpath}")`,
        playwright,
        strategy: "text",
        stability: "medium"
    };
};

window.AQT.getCssFallbackMeta = function (element, tag) {
    const uniqueClassSelector = window.AQT.getUniqueClassSelector(element, tag);

    if (uniqueClassSelector) {
        return {
            value: uniqueClassSelector,
            strategy: "class",
            stability: "medium"
        };
    }

    const containsClassSelector = window.AQT.getClassContainsSelector(element, tag);

    if (containsClassSelector) {
        return {
            value: containsClassSelector,
            strategy: "class*",
            stability: "medium"
        };
    }

    return {
        value: window.AQT.getIndexedCssSelector(element, tag),
        strategy: "tag+nth",
        stability: "weak"
    };
};

window.AQT.generateSelectors = function (elementInfo, element) {
    const tag = elementInfo.tag ? elementInfo.tag.toLowerCase() : "*";

    const selectorMeta = {
        css: { value: "", strategy: "", stability: "weak" },
        xpath: { value: "", strategy: "", stability: "weak" },
        selenide: { value: "", strategy: "", stability: "weak" },
        playwright: { value: "", strategy: "", stability: "weak" }
    };

    if (elementInfo.dataE2e || elementInfo.dataTestId || elementInfo.dataTest || elementInfo.id || elementInfo.name) {
        const attrPriority = [
            { key: "dataE2e", attr: "data-e2e", strategy: "data-e2e", stability: "stable" },
            { key: "dataTestId", attr: "data-testid", strategy: "data-testid", stability: "stable" },
            { key: "dataTest", attr: "data-test", strategy: "data-test", stability: "stable" },
            { key: "id", attr: "id", strategy: "id", stability: "stable", isId: true },
            { key: "name", attr: "name", strategy: "name", stability: "medium" }
        ];

        const selected = attrPriority.find((item) => elementInfo[item.key]);

        if (selected) {
            const rawValue = elementInfo[selected.key];
            const escapedCss = window.AQT.escapeCssValue(rawValue);
            const escapedXpath = window.AQT.escapeXpathValue(rawValue);
            const escapedJs = window.AQT.escapeJsSingleQuotedString(rawValue);

            if (selected.isId) {
                selectorMeta.css = {
                    value: `#${escapedCss}`,
                    strategy: selected.strategy,
                    stability: selected.stability
                };
                selectorMeta.playwright = {
                    value: `page.locator('#${escapedJs}')`,
                    strategy: selected.strategy,
                    stability: selected.stability
                };
                selectorMeta.selenide = {
                    value: `$("#${window.AQT.escapeJsSingleQuotedString(rawValue)}")`,
                    strategy: selected.strategy,
                    stability: selected.stability
                };
            } else {
                selectorMeta.css = {
                    value: `[${selected.attr}="${escapedCss}"]`,
                    strategy: selected.strategy,
                    stability: selected.stability
                };
                selectorMeta.playwright = {
                    value: `page.locator('[${selected.attr}="${escapedJs}"]')`,
                    strategy: selected.strategy,
                    stability: selected.stability
                };
                selectorMeta.selenide = {
                    value: `$('[${selected.attr}="${window.AQT.escapeJsSingleQuotedString(rawValue)}"]')`,
                    strategy: selected.strategy,
                    stability: selected.stability
                };
            }

            selectorMeta.xpath = {
                value: `//${tag}[@${selected.attr}=${escapedXpath}]`,
                strategy: selected.strategy,
                stability: selected.stability
            };
        }
    } else {
        const textBasedSelectors = window.AQT.getTextBasedSelectors(element, tag);

        if (textBasedSelectors) {
            const cssFallback = window.AQT.getCssFallbackMeta(element, tag);

            selectorMeta.css = {
                value: cssFallback.value,
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            };
            selectorMeta.xpath = {
                value: textBasedSelectors.xpath,
                strategy: textBasedSelectors.strategy,
                stability: textBasedSelectors.stability
            };
            selectorMeta.selenide = {
                value: textBasedSelectors.selenide,
                strategy: textBasedSelectors.strategy,
                stability: textBasedSelectors.stability
            };
            selectorMeta.playwright = {
                value: textBasedSelectors.playwright,
                strategy: textBasedSelectors.strategy,
                stability: textBasedSelectors.stability
            };
        } else {
            const cssFallback = window.AQT.getCssFallbackMeta(element, tag);
            const xpath = window.AQT.getIndexedXpath(element, tag);

            selectorMeta.css = {
                value: cssFallback.value,
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            };
            selectorMeta.xpath = {
                value: xpath,
                strategy: "tag+nth",
                stability: "weak"
            };
            selectorMeta.selenide = {
                value: `$("${cssFallback.value}")`,
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            };
            selectorMeta.playwright = {
                value: `page.locator('${cssFallback.value}')`,
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            };
        }
    }

    const bestKey = Object.keys(selectorMeta)
        .sort((a, b) => window.AQT.stabilityRank(selectorMeta[b].stability) - window.AQT.stabilityRank(selectorMeta[a].stability))[0];

    const strategy = selectorMeta[bestKey].strategy;
    const stability = selectorMeta[bestKey].stability;

    const allSelectorsText =
        `Best strategy: ${strategy}\n` +
        `Overall stability: ${stability}\n` +
        `CSS [${selectorMeta.css.stability}]: ${selectorMeta.css.value}\n` +
        `XPath [${selectorMeta.xpath.stability}]: ${selectorMeta.xpath.value}\n` +
        `Selenide [${selectorMeta.selenide.stability}]: ${selectorMeta.selenide.value}\n` +
        `Playwright [${selectorMeta.playwright.stability}]: ${selectorMeta.playwright.value}`;

    return {
        strategy,
        stability,
        css: selectorMeta.css.value,
        xpath: selectorMeta.xpath.value,
        selenide: selectorMeta.selenide.value,
        playwright: selectorMeta.playwright.value,
        selectorMeta,
        allSelectorsText
    };
};
