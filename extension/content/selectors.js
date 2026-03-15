window.AQT = window.AQT || {};

window.AQT.qaAttributePriority = [
    "data-testid",
    "data-test-id",
    "data-cy",
    "data-test",
    "data-qa",
    "data-qa-id",
    "data-e2e",
    "data-e2e-id",
    "data-pw",
    "data-hook",
    "data-automation",
    "data-automation-id",
    "data-auto",
    "data-selector"
];

window.AQT.getBestTarget = function (element) {
    const clickableTags = ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"];

    let current = element;

    while (current && current !== document.body) {
        if (clickableTags.includes(current.tagName)) {
            return current;
        }

        if (current.getAttribute) {
            const hasQaAttribute = window.AQT.qaAttributePriority
                .some((attr) => current.getAttribute(attr));

            if (
                hasQaAttribute ||
                current.id ||
                current.getAttribute("aria-label") ||
                current.getAttribute("name") ||
                current.getAttribute("href")
            ) {
                return current;
            }
        }

        current = current.parentElement;
    }

    return element;
};

window.AQT.buildElementInfo = function (element) {
    const qaAttributes = {};

    window.AQT.qaAttributePriority.forEach((attr) => {
        const value = element.getAttribute(attr);

        if (value) {
            qaAttributes[attr] = value;
        }
    });

    return {
        tag: element.tagName,
        id: element.id,
        classes: element.className,
        text: element.innerText,
        qaAttributes,
        ariaLabel: element.getAttribute("aria-label"),
        alt: element.getAttribute("alt"),
        title: element.getAttribute("title"),
        href: element.getAttribute("href"),
        role: element.getAttribute("role"),
        name: element.getAttribute("name")
    };
};

window.AQT.escapeCssIdentifier = function (value) {
    if (value == null) return "";

    if (typeof CSS !== "undefined" && CSS.escape) {
        return CSS.escape(String(value));
    }

    return String(value).replace(/([^a-zA-Z0-9_-])/g, "\\$1");
};

window.AQT.escapeCssValue = function (value) {
    if (value == null) return "";

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, "\\\"")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
};

window.AQT.escapeXpathValue = function (value) {
    if (value == null) return "''";

    const stringValue = String(value);

    if (!stringValue.includes("'")) {
        return `'${stringValue}'`;
    }

    if (!stringValue.includes("\"")) {
        return `"${stringValue}"`;
    }

    const parts = stringValue.split("\"");
    const escapedParts = parts.map((part) => `"${part}"`).join(', "\\"", ');

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

window.AQT.selectorPriorityRank = function (key) {
    const ranks = {
        css: 5,
        xpath: 4,
        playwright: 3,
        selenideXpath: 2,
        selenideCss: 1
    };

    return ranks[key] || 0;
};

window.AQT.strategyRank = function (strategy) {
    if (!strategy) return 0;

    if (strategy.startsWith("data-")) return 80;
    if (strategy === "id") return 70;
    if (strategy === "role+name" || strategy === "aria-label" || strategy === "alt") return 60;
    if (strategy === "text") return 55;
    if (strategy === "href") return 45;
    if (strategy === "name") return 40;
    if (strategy === "class") return 30;
    if (strategy === "class*") return 25;
    if (strategy === "tag+nth") return 10;

    return 20;
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
        const selector = `${tag}.${window.AQT.escapeCssIdentifier(className)}`;

        if (document.querySelectorAll(selector).length === 1) {
            return selector;
        }
    }

    if (classNames.length > 1) {
        const selector = `${tag}.${classNames
            .map((className) => window.AQT.escapeCssIdentifier(className))
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
    if (!element) {
        return `//${tag}`;
    }

    const allMatching = Array.from(document.querySelectorAll(tag));
    const indexInDocument = allMatching.indexOf(element) + 1;

    if (indexInDocument <= 0) {
        return `//${tag}`;
    }

    return `(//${tag})[${indexInDocument}]`;
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
    const xpath = `//${tag}[normalize-space()=${escapedTextForXpath}]`;

    let playwright = `page.getByText('${escapedTextForJs}', { exact: true })`;

    if (tag === "button") {
        playwright = `page.getByRole('button', { name: '${escapedTextForJs}', exact: true })`;
    } else if (tag === "a") {
        playwright = `page.getByRole('link', { name: '${escapedTextForJs}', exact: true })`;
    }

    return {
        xpath,
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


window.AQT.getXpathFallbackMeta = function (element, tag) {
    const uniqueClassSelector = window.AQT.getUniqueClassSelector(element, tag);

    if (uniqueClassSelector) {
        const classNames = uniqueClassSelector.split(".").slice(1);
        const classPredicate = classNames
            .map((className) => `contains(concat(" ", normalize-space(@class), " "), ${window.AQT.escapeXpathValue(` ${className} `)})`)
            .join(" and ");

        return {
            value: `//${tag}[${classPredicate}]`,
            strategy: "class",
            stability: "medium"
        };
    }

    const containsClassSelector = window.AQT.getClassContainsSelector(element, tag);

    if (containsClassSelector) {
        const match = containsClassSelector.match(/\[class\*=\'(.+)\'\]$/);

        if (match && match[1]) {
            const fragment = match[1];
            const xpath = `//${tag}[contains(@class, ${window.AQT.escapeXpathValue(fragment)})]`;
            const uniqueXpath = document.evaluate(
                `count(${xpath})`,
                document,
                null,
                XPathResult.NUMBER_TYPE,
                null
            ).numberValue === 1;

            if (uniqueXpath) {
                return {
                    value: xpath,
                    strategy: "class*",
                    stability: "medium"
                };
            }
        }
    }

    return {
        value: window.AQT.getIndexedXpath(element, tag),
        strategy: "tag+nth",
        stability: "weak"
    };
};

window.AQT.getFirstQaAttribute = function (elementInfo) {
    if (!elementInfo || !elementInfo.qaAttributes) {
        return null;
    }

    for (const attr of window.AQT.qaAttributePriority) {
        if (elementInfo.qaAttributes[attr]) {
            return {
                attr,
                value: elementInfo.qaAttributes[attr]
            };
        }
    }

    return null;
};

window.AQT.isLikelyGeneratedId = function (idValue) {
    if (!idValue) return true;

    return (
        /__[a-z0-9]+_[a-z0-9]+/i.test(idValue) ||
        /[a-f0-9]{8,}/i.test(idValue) ||
        /[0-9]{4,}/.test(idValue)
    );
};

window.AQT.isUsefulHref = function (hrefValue) {
    if (!hrefValue) return false;

    const href = String(hrefValue).trim();

    if (!href || href === "#") return false;
    if (href.startsWith("javascript:")) return false;

    return true;
};

window.AQT.getSelectorQualityScore = function (selectors, sourceElement) {
    if (!selectors || !selectors.recommendedKey || !selectors.selectorMeta) {
        return -1;
    }

    let score = window.AQT.stabilityRank(selectors.stability) * 100;

    if (selectors.recommendedKey === "css") score += 5;
    if (selectors.recommendedKey === "xpath") score += 4;
    if (selectors.recommendedKey === "playwright") score += 3;

    const strategy = selectors.strategy || "";

    if (strategy.startsWith("data-")) score += 50;
    if (strategy === "id") score += 40;
    if (strategy === "alt" || strategy === "aria-label" || strategy === "role+name") score += 35;
    if (strategy === "href") score += 30;
    if (strategy === "text") score += 25;
    if (strategy === "name") score += 20;
    if (strategy === "class" || strategy === "class*") score += 10;
    if (strategy === "tag+nth") score -= 30;

    if (sourceElement && sourceElement.tagName === "IMG" && strategy === "alt") {
        score += 20;
    }

    return score;
};

window.AQT.pickBetterSelectorCandidate = function (first, second) {
    if (!first) return second;
    if (!second) return first;

    const firstScore = window.AQT.getSelectorQualityScore(first.selectors, first.sourceElement);
    const secondScore = window.AQT.getSelectorQualityScore(second.selectors, second.sourceElement);

    if (secondScore > firstScore) {
        return second;
    }

    return first;
};

window.AQT.generateSelectors = function (elementInfo, element) {
    const tag = elementInfo.tag ? elementInfo.tag.toLowerCase() : "*";

    const selectorMeta = {
        css: { value: "", strategy: "", stability: "weak" },
        xpath: { value: "", strategy: "", stability: "weak" },
        selenideCss: { value: "", strategy: "", stability: "weak" },
        selenideXpath: { value: "", strategy: "", stability: "weak" },
        playwright: { value: "", strategy: "", stability: "weak" }
    };

    const qaAttr = window.AQT.getFirstQaAttribute(elementInfo);

    if (qaAttr) {
        const escapedCss = window.AQT.escapeCssValue(qaAttr.value);
        const escapedXpath = window.AQT.escapeXpathValue(qaAttr.value);
        const escapedJs = window.AQT.escapeJsSingleQuotedString(qaAttr.value);

        selectorMeta.css = {
            value: `[${qaAttr.attr}="${escapedCss}"]`,
            strategy: qaAttr.attr,
            stability: "stable"
        };
        selectorMeta.xpath = {
            value: `//${tag}[@${qaAttr.attr}=${escapedXpath}]`,
            strategy: qaAttr.attr,
            stability: "stable"
        };
        selectorMeta.selenideCss = {
            value: `$('[${qaAttr.attr}="${window.AQT.escapeJsSingleQuotedString(qaAttr.value)}"]')`,
            strategy: qaAttr.attr,
            stability: "stable"
        };
        selectorMeta.selenideXpath = {
            value: `$x("//${tag}[@${qaAttr.attr}=${escapedXpath}]")`,
            strategy: qaAttr.attr,
            stability: "stable"
        };
        selectorMeta.playwright = {
            value: `page.locator('[${qaAttr.attr}="${escapedJs}"]')`,
            strategy: qaAttr.attr,
            stability: "stable"
        };
    } else if (elementInfo.id && !window.AQT.isLikelyGeneratedId(elementInfo.id)) {
        const escapedId = window.AQT.escapeCssIdentifier(elementInfo.id);
        const escapedXpath = window.AQT.escapeXpathValue(elementInfo.id);
        const escapedJs = window.AQT.escapeJsSingleQuotedString(elementInfo.id);

        selectorMeta.css = {
            value: `#${escapedId}`,
            strategy: "id",
            stability: "stable"
        };
        selectorMeta.xpath = {
            value: `//${tag}[@id=${escapedXpath}]`,
            strategy: "id",
            stability: "stable"
        };
        selectorMeta.selenideCss = {
            value: `$("#${escapedJs}")`,
            strategy: "id",
            stability: "stable"
        };
        selectorMeta.selenideXpath = {
            value: `$x("//${tag}[@id=${escapedXpath}]")`,
            strategy: "id",
            stability: "stable"
        };
        selectorMeta.playwright = {
            value: `page.locator('#${escapedJs}')`,
            strategy: "id",
            stability: "stable"
        };
    } else if (tag === "img" && elementInfo.alt) {
        const escapedAltCss = window.AQT.escapeCssValue(elementInfo.alt);
        const escapedAltXpath = window.AQT.escapeXpathValue(elementInfo.alt);
        const escapedAltJs = window.AQT.escapeJsSingleQuotedString(elementInfo.alt);

        selectorMeta.css = {
            value: `img[alt="${escapedAltCss}"]`,
            strategy: "alt",
            stability: "medium"
        };
        selectorMeta.xpath = {
            value: `//img[@alt=${escapedAltXpath}]`,
            strategy: "alt",
            stability: "medium"
        };
        selectorMeta.selenideCss = {
            value: `$('img[alt="${escapedAltJs}"]')`,
            strategy: "alt",
            stability: "medium"
        };
        selectorMeta.selenideXpath = {
            value: `$x("//img[@alt=${escapedAltXpath}]")`,
            strategy: "alt",
            stability: "medium"
        };
        selectorMeta.playwright = {
            value: `page.getByAltText('${escapedAltJs}', { exact: true })`,
            strategy: "alt",
            stability: "medium"
        };
    } else if (elementInfo.ariaLabel) {
        const escapedAria = window.AQT.escapeCssValue(elementInfo.ariaLabel);
        const escapedXpath = window.AQT.escapeXpathValue(elementInfo.ariaLabel);
        const escapedJs = window.AQT.escapeJsSingleQuotedString(elementInfo.ariaLabel);

        selectorMeta.css = {
            value: `[aria-label="${escapedAria}"]`,
            strategy: "aria-label",
            stability: "medium"
        };
        selectorMeta.xpath = {
            value: `//${tag}[@aria-label=${escapedXpath}]`,
            strategy: "aria-label",
            stability: "medium"
        };
        selectorMeta.selenideCss = {
            value: `$('[aria-label="${window.AQT.escapeJsSingleQuotedString(elementInfo.ariaLabel)}"]')`,
            strategy: "aria-label",
            stability: "medium"
        };
        selectorMeta.selenideXpath = {
            value: `$x("//${tag}[@aria-label=${escapedXpath}]")`,
            strategy: "aria-label",
            stability: "medium"
        };
        selectorMeta.playwright = {
            value: elementInfo.role
                ? `page.getByRole('${window.AQT.escapeJsSingleQuotedString(elementInfo.role)}', { name: '${escapedJs}', exact: true })`
                : `page.getByLabel('${escapedJs}', { exact: true })`,
            strategy: "role+name",
            stability: "medium"
        };
    } else if (tag === "a" && window.AQT.isUsefulHref(elementInfo.href)) {
        const escapedHrefCss = window.AQT.escapeCssValue(elementInfo.href);
        const escapedHrefXpath = window.AQT.escapeXpathValue(elementInfo.href);
        const escapedHrefJs = window.AQT.escapeJsSingleQuotedString(elementInfo.href);

        selectorMeta.css = {
            value: `a[href="${escapedHrefCss}"]`,
            strategy: "href",
            stability: "medium"
        };
        selectorMeta.xpath = {
            value: `//a[@href=${escapedHrefXpath}]`,
            strategy: "href",
            stability: "medium"
        };
        selectorMeta.selenideCss = {
            value: `$('a[href="${escapedHrefJs}"]')`,
            strategy: "href",
            stability: "medium"
        };
        selectorMeta.selenideXpath = {
            value: `$x("//a[@href=${escapedHrefXpath}]")`,
            strategy: "href",
            stability: "medium"
        };
        selectorMeta.playwright = {
            value: `page.locator('a[href="${escapedHrefJs}"]')`,
            strategy: "href",
            stability: "medium"
        };
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
            selectorMeta.selenideCss = {
                value: `$("${cssFallback.value}")`,
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            };
            selectorMeta.selenideXpath = {
                value: `$x("${textBasedSelectors.xpath}")`,
                strategy: textBasedSelectors.strategy,
                stability: textBasedSelectors.stability
            };
            selectorMeta.playwright = {
                value: textBasedSelectors.playwright,
                strategy: textBasedSelectors.strategy,
                stability: textBasedSelectors.stability
            };
        } else if (elementInfo.name) {
            const escapedName = window.AQT.escapeCssValue(elementInfo.name);
            const escapedXpath = window.AQT.escapeXpathValue(elementInfo.name);
            const escapedJs = window.AQT.escapeJsSingleQuotedString(elementInfo.name);

            selectorMeta.css = {
                value: `[name="${escapedName}"]`,
                strategy: "name",
                stability: "medium"
            };
            selectorMeta.xpath = {
                value: `//${tag}[@name=${escapedXpath}]`,
                strategy: "name",
                stability: "medium"
            };
            selectorMeta.selenideCss = {
                value: `$('[name="${escapedJs}"]')`,
                strategy: "name",
                stability: "medium"
            };
            selectorMeta.selenideXpath = {
                value: `$x("//${tag}[@name=${escapedXpath}]")`,
                strategy: "name",
                stability: "medium"
            };
            selectorMeta.playwright = {
                value: `page.locator('[name="${escapedJs}"]')`,
                strategy: "name",
                stability: "medium"
            };
        } else {
            const cssFallback = window.AQT.getCssFallbackMeta(element, tag);
            const xpathFallback = window.AQT.getXpathFallbackMeta(element, tag);

            selectorMeta.css = {
                value: cssFallback.value,
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            };
            selectorMeta.xpath = {
                value: xpathFallback.value,
                strategy: xpathFallback.strategy,
                stability: xpathFallback.stability
            };
            selectorMeta.selenideCss = {
                value: `$("${cssFallback.value}")`,
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            };
            selectorMeta.selenideXpath = {
                value: `$x("${xpathFallback.value}")`,
                strategy: xpathFallback.strategy,
                stability: xpathFallback.stability
            };
            selectorMeta.playwright = {
                value: `page.locator('${cssFallback.value}')`,
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            };
        }
    }

    const orderedSelectorKeys = Object.keys(selectorMeta)
        .sort((a, b) => {
            const stabilityDiff = window.AQT.stabilityRank(selectorMeta[b].stability) - window.AQT.stabilityRank(selectorMeta[a].stability);

            if (stabilityDiff !== 0) {
                return stabilityDiff;
            }

            const strategyDiff = window.AQT.strategyRank(selectorMeta[b].strategy) - window.AQT.strategyRank(selectorMeta[a].strategy);

            if (strategyDiff !== 0) {
                return strategyDiff;
            }

            return window.AQT.selectorPriorityRank(b) - window.AQT.selectorPriorityRank(a);
        });

    const bestKey = orderedSelectorKeys[0];
    const strategy = selectorMeta[bestKey].strategy;
    const stability = selectorMeta[bestKey].stability;

    const allSelectorsText =
        `Best strategy: ${strategy}
` +
        `Overall stability: ${stability}
` +
        `Recommended (${bestKey}): ${selectorMeta[bestKey].value}
` +
        `CSS [${selectorMeta.css.stability}]: ${selectorMeta.css.value}
` +
        `XPath [${selectorMeta.xpath.stability}]: ${selectorMeta.xpath.value}
` +
        `Selenide CSS [${selectorMeta.selenideCss.stability}]: ${selectorMeta.selenideCss.value}
` +
        `Selenide XPath [${selectorMeta.selenideXpath.stability}]: ${selectorMeta.selenideXpath.value}
` +
        `Playwright [${selectorMeta.playwright.stability}]: ${selectorMeta.playwright.value}`;

    return {
        strategy,
        stability,
        recommendedKey: bestKey,
        recommendedSelector: selectorMeta[bestKey].value,
        orderedSelectorKeys,
        css: selectorMeta.css.value,
        xpath: selectorMeta.xpath.value,
        selenideCss: selectorMeta.selenideCss.value,
        selenideXpath: selectorMeta.selenideXpath.value,
        selenide: selectorMeta.selenideXpath.value,
        playwright: selectorMeta.playwright.value,
        selectorMeta,
        allSelectorsText
    };
};
