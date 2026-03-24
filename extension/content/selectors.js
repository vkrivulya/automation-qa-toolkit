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

window.AQT.interactiveRoleSelector = [
    '[role="button"]',
    '[role="link"]',
    '[role="textbox"]',
    '[role="searchbox"]',
    '[role="combobox"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="option"]',
    '[contenteditable="true"]'
].join(", ");

window.AQT.compositeControlSelector = [
    '.ant-select',
    '.ant-picker',
    '.ant-input-affix-wrapper',
    '.ant-input-number',
    '[role="combobox"]',
    '[aria-haspopup="listbox"]',
    '[aria-haspopup="dialog"]'
].join(", ");

window.AQT.isVisiblePickerTarget = function (element) {
    if (!element || !element.getBoundingClientRect) {
        return false;
    }

    const style = window.getComputedStyle ? window.getComputedStyle(element) : null;

    if (style) {
        if (style.display === "none" || style.visibility === "hidden") {
            return false;
        }

        if (Number(style.opacity || "1") === 0) {
            return false;
        }
    }

    const rect = element.getBoundingClientRect();

    return rect.width > 0 && rect.height > 0;
};

window.AQT.getVisibleCompositeTarget = function (element) {
    if (!element || !element.closest) {
        return null;
    }

    const compositeAncestor = element.closest(window.AQT.compositeControlSelector);

    if (!compositeAncestor) {
        return null;
    }

    const visibleCandidates = [
        compositeAncestor.matches(".ant-select")
            ? compositeAncestor.querySelector(".ant-select-selector")
            : null,
        compositeAncestor.matches(".ant-picker")
            ? compositeAncestor
            : null,
        compositeAncestor.matches(".ant-input-affix-wrapper, .ant-input-number")
            ? compositeAncestor
            : null,
        compositeAncestor
    ].filter(Boolean);

    return visibleCandidates.find((candidate) => window.AQT.isVisiblePickerTarget(candidate)) || null;
};

window.AQT.findBestDescendantTarget = function (element) {
    if (!element || !element.querySelector) {
        return null;
    }

    const qaSelector = window.AQT.qaAttributePriority
        .map((attr) => `[${attr}]`)
        .join(", ");

    const preferredSelector = `${qaSelector}, a, button, input, select, textarea, ${window.AQT.interactiveRoleSelector}`;

    return element.querySelector(preferredSelector);
};

window.AQT.isInteractiveElement = function (element) {
    if (!element || !element.tagName) {
        return false;
    }

    const interactiveTags = ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "OPTION"];

    if (interactiveTags.includes(element.tagName)) {
        return true;
    }

    const role = element.getAttribute && element.getAttribute("role");

    return Boolean(
        role && ["button", "link", "textbox", "searchbox", "combobox", "checkbox", "radio", "switch", "tab", "option"].includes(role)
    );
};

window.AQT.isGenericContainerTarget = function (element) {
    if (!element || !element.tagName) {
        return false;
    }

    return ["FORM", "MAIN", "SECTION", "ARTICLE", "NAV", "ASIDE", "HEADER", "FOOTER"].includes(element.tagName);
};

window.AQT.getBestTarget = function (element) {
    if (!element) {
        return null;
    }

    const visibleCompositeTarget = window.AQT.getVisibleCompositeTarget(element);

    if (visibleCompositeTarget) {
        return visibleCompositeTarget;
    }

    if (window.AQT.isInteractiveElement(element)) {
        if (!window.AQT.isVisiblePickerTarget(element)) {
            const interactiveCompositeTarget = window.AQT.getVisibleCompositeTarget(element);

            if (interactiveCompositeTarget) {
                return interactiveCompositeTarget;
            }
        }

        return element;
    }

    const closestInteractive = element.closest
        ? element.closest(`a, button, input, select, textarea, ${window.AQT.interactiveRoleSelector}`)
        : null;

    if (closestInteractive) {
        if (!window.AQT.isVisiblePickerTarget(closestInteractive)) {
            const closestCompositeTarget = window.AQT.getVisibleCompositeTarget(closestInteractive);

            if (closestCompositeTarget) {
                return closestCompositeTarget;
            }
        }

        return closestInteractive;
    }

    const descendantTarget = window.AQT.findBestDescendantTarget(element);

    if (descendantTarget) {
        if (!window.AQT.isVisiblePickerTarget(descendantTarget)) {
            const descendantCompositeTarget = window.AQT.getVisibleCompositeTarget(descendantTarget);

            if (descendantCompositeTarget) {
                return descendantCompositeTarget;
            }
        }

        return descendantTarget;
    }

    let current = element;

    while (current && current !== document.body) {
        if (window.AQT.isInteractiveElement(current)) {
            return current;
        }

        if (current.getAttribute) {
            const hasUsefulTitle = Boolean(current.getAttribute("title"));
            const hasSemanticOptionRole = current.getAttribute("role") === "option";
            const hasQaAttribute = window.AQT.qaAttributePriority
                .some((attr) => current.getAttribute(attr));

            if (hasQaAttribute) {
                return current;
            }

            if (!window.AQT.isGenericContainerTarget(current) && (hasUsefulTitle || hasSemanticOptionRole)) {
                return current;
            }

            const hasUsefulAttributes = Boolean(
                current.getAttribute("aria-label") ||
                current.getAttribute("name") ||
                current.getAttribute("href")
            );

            if (!window.AQT.isGenericContainerTarget(current) && (current.id || hasUsefulAttributes)) {
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

window.AQT.getNearestTitledAncestor = function (element) {
    if (!element || !element.closest) {
        return null;
    }

    const candidate = element.closest('[title]');

    if (!candidate || !candidate.getAttribute("title")) {
        return null;
    }

    return candidate;
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
    if (strategy === "title") return 58;
    if (strategy === "text") return 55;
    if (strategy === "text-contains") return 52;
    if (strategy === "context-text") return 50;
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

window.AQT.getTextAlternativeCandidates = function (element, tag) {
    if (!element) {
        return [];
    }

    const text = window.AQT.normalizeText(element.innerText || element.textContent || element.getAttribute("title"));

    if (!text || text.length < 2 || text.length > 80) {
        return [];
    }

    const escapedText = window.AQT.escapeXpathValue(text);
    const exactXpath = `//${tag}[normalize-space()=${escapedText}]`;
    const containsXpath = `//${tag}[contains(normalize-space(), ${escapedText})]`;
    const exactCount = document.evaluate(`count(${exactXpath})`, document, null, XPathResult.NUMBER_TYPE, null).numberValue;
    const containsCount = document.evaluate(`count(${containsXpath})`, document, null, XPathResult.NUMBER_TYPE, null).numberValue;
    const alternatives = [];

    if (exactCount >= 1) {
        alternatives.push({
            value: exactXpath,
            raw: exactXpath,
            type: "xpath",
            meta: { strategy: "text", stability: exactCount === 1 ? "medium" : "weak" },
            label: "XPath exact text",
            hint: "Find by exact text (ignores spaces)."
        });
    }

    if (containsCount >= 1) {
        alternatives.push({
            value: containsXpath,
            raw: containsXpath,
            type: "xpath",
            meta: { strategy: "text-contains", stability: containsCount === 1 ? "medium" : "weak" },
            label: "XPath contains text",
            hint: "Find by partial text (ignores spaces)."
        });
    }

    return alternatives;
};

window.AQT.getTitleBasedMeta = function (element, elementInfo, tag) {
    if (!element) {
        return null;
    }

    const titledTarget = elementInfo?.title
        ? element
        : window.AQT.getNearestTitledAncestor(element);

    if (!titledTarget) {
        return null;
    }

    const titledInfo = window.AQT.buildElementInfo(titledTarget);
    const title = window.AQT.normalizeText(titledInfo.title);

    if (!title || title.length > 120) {
        return null;
    }

    const effectiveTag = titledInfo.tag ? titledInfo.tag.toLowerCase() : tag;
    const role = titledTarget.getAttribute && titledTarget.getAttribute("role");
    const escapedTitleCss = window.AQT.escapeCssValue(title);
    const escapedTitleXpath = window.AQT.escapeXpathValue(title);
    const escapedTitleJs = window.AQT.escapeJsSingleQuotedString(title);
    const cssSelector = role
        ? `${effectiveTag}[role="${window.AQT.escapeCssValue(role)}"][title="${escapedTitleCss}"]`
        : `${effectiveTag}[title="${escapedTitleCss}"]`;
    const xpathSelector = role
        ? `//${effectiveTag}[@role=${window.AQT.escapeXpathValue(role)} and @title=${escapedTitleXpath}]`
        : `//${effectiveTag}[@title=${escapedTitleXpath}]`;
    const titleOnlyXpath = `//${effectiveTag}[@title=${escapedTitleXpath}]`;
    const xpathCount = document.evaluate(
        `count(${xpathSelector})`,
        document,
        null,
        XPathResult.NUMBER_TYPE,
        null
    ).numberValue;

    if (xpathCount !== 1) {
        return null;
    }

    return {
        css: {
            value: cssSelector,
            strategy: "title",
            stability: "medium"
        },
        xpath: {
            value: xpathSelector,
            strategy: "title",
            stability: "medium"
        },
        titleOnlyXpath,
        selenideCss: {
            value: `$('${window.AQT.escapeJsSingleQuotedString(cssSelector)}')`,
            strategy: "title",
            stability: "medium"
        },
        selenideXpath: {
            value: `$x("${xpathSelector}")`,
            strategy: "title",
            stability: "medium"
        },
        playwright: {
            value: role
                ? `page.getByRole('${window.AQT.escapeJsSingleQuotedString(role)}', { name: '${escapedTitleJs}', exact: true })`
                : `page.locator('${window.AQT.escapeJsSingleQuotedString(cssSelector)}')`,
            strategy: role ? "role+name" : "title",
            stability: "medium"
        }
    };
};

window.AQT.getAncestorAlternativeCandidates = function (element) {
    if (!element) {
        return [];
    }

    const candidates = [];
    const seen = new Set();
    const ancestorTargets = [
        window.AQT.getVisibleCompositeTarget(element),
        element.closest(".ant-select"),
        element.parentElement
    ].filter((target, index, list) => (
        target
        && target !== element
        && list.indexOf(target) === index
    ));

    ancestorTargets.forEach((target, index) => {
        const tag = target.tagName ? target.tagName.toLowerCase() : "*";
        const cssFallback = window.AQT.getCssFallbackMeta(target, tag);
        const contextualXpath = window.AQT.getContextualXpathMeta(target, tag);
        const xpathFallback = contextualXpath || window.AQT.getXpathFallbackMeta(target, tag);
        const cssValue = cssFallback.value;
        const xpathValue = xpathFallback.value;
        const key = `${cssValue}::${xpathValue}`;

        if (!cssValue || !xpathValue || seen.has(key)) {
            return;
        }

        seen.add(key);
        candidates.push({
            value: cssValue,
            raw: cssValue,
            type: "css",
            meta: {
                strategy: cssFallback.strategy,
                stability: cssFallback.stability
            },
            label: index === 0 ? "Container" : "Parent element",
            hint: index === 0
                ? "Visible wrapper for the hovered element."
                : "Nearby ancestor element."
        });
        candidates.push({
            value: xpathValue,
            raw: xpathValue,
            type: "xpath",
            meta: {
                strategy: xpathFallback.strategy,
                stability: xpathFallback.stability
            },
            label: index === 0 ? "Container XPath" : "Parent XPath",
            hint: index === 0
                ? "XPath for the visible wrapper."
                : "XPath for a nearby ancestor."
        });
    });

    return candidates;
};

window.AQT.getNearestQaAncestor = function (element) {
    if (!element || !element.closest) {
        return null;
    }

    const selector = window.AQT.qaAttributePriority
        .map((attr) => `[${attr}]`)
        .join(", ");
    const ancestor = element.closest(selector);

    if (!ancestor) {
        return null;
    }

    const ancestorInfo = window.AQT.buildElementInfo(ancestor);
    const qaAttr = window.AQT.getFirstQaAttribute(ancestorInfo);

    if (!qaAttr) {
        return null;
    }

    return {
        element: ancestor,
        info: ancestorInfo,
        qaAttr
    };
};

window.AQT.getQaAncestorAlternativeCandidates = function (element) {
    const nearestQaAncestor = window.AQT.getNearestQaAncestor(element);

    if (!nearestQaAncestor) {
        return [];
    }

    const { qaAttr } = nearestQaAncestor;
    const escapedCss = window.AQT.escapeCssValue(qaAttr.value);
    const escapedXpath = window.AQT.escapeXpathValue(qaAttr.value);

    return [
        {
            value: `[${qaAttr.attr}="${escapedCss}"]`,
            raw: `[${qaAttr.attr}="${escapedCss}"]`,
            type: "css",
            meta: { strategy: qaAttr.attr, stability: "stable" },
            label: "QA ancestor",
            hint: "Stable qa/data attribute found on a parent container."
        },
        {
            value: `//*[@${qaAttr.attr}=${escapedXpath}]`,
            raw: `//*[@${qaAttr.attr}=${escapedXpath}]`,
            type: "xpath",
            meta: { strategy: qaAttr.attr, stability: "stable" },
            label: "QA ancestor XPath",
            hint: "XPath to the stable qa/data ancestor."
        }
    ];
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
        /^[a-z]+(?:_[a-z]+)+_[0-9]{1,4}$/i.test(idValue) ||
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


window.AQT.getStableText = function (value) {
    const text = window.AQT.normalizeText(value);

    if (!text || text.length < 2 || text.length > 80) {
        return "";
    }

    return text;
};

window.AQT.getContextTextCandidates = function (element) {
    if (!element || !element.closest) {
        return [];
    }

    const candidates = [];
    const pushCandidate = (value) => {
        const text = window.AQT.getStableText(value);

        if (text && !candidates.includes(text)) {
            candidates.push(text);
        }
    };

    pushCandidate(element.getAttribute && element.getAttribute("placeholder"));
    pushCandidate(element.getAttribute && element.getAttribute("aria-label"));
    pushCandidate(element.getAttribute && element.getAttribute("title"));

    const labelledBy = element.getAttribute && element.getAttribute("aria-labelledby");
    if (labelledBy) {
        labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id))
            .filter(Boolean)
            .forEach((labelElement) => pushCandidate(labelElement.innerText || labelElement.textContent));
    }

    if (element.id) {
        const escapedId = window.AQT.escapeCssIdentifier(element.id);
        const label = document.querySelector(`label[for="${escapedId}"]`);
        if (label) {
            pushCandidate(label.innerText || label.textContent);
        }
    }

    const placeholderNode = element.parentElement && element.parentElement.parentElement
        ? element.parentElement.parentElement.querySelector('.ant-select-selection-placeholder')
        : null;

    if (placeholderNode) {
        pushCandidate(placeholderNode.innerText || placeholderNode.textContent);
    }

    const selectedItemNode = element.parentElement && element.parentElement.parentElement
        ? element.parentElement.parentElement.querySelector('.ant-select-selection-item')
        : null;

    if (selectedItemNode) {
        pushCandidate(selectedItemNode.innerText || selectedItemNode.textContent);
    }

    const containers = [
        element.closest('.ant-form-item'),
        element.closest('[class*="form-item"]'),
        element.closest('[class*="FormItem"]'),
        element.closest('[class*="wrapper"]')
    ].filter(Boolean);

    containers.forEach((container) => {
        Array.from(container.querySelectorAll('label, legend, [class*="label"], [class*="Label"]'))
            .forEach((node) => pushCandidate(node.innerText || node.textContent));
    });

    return candidates;
};

window.AQT.getContextualXpathMeta = function (element, tag) {
    if (!element) return null;

    const contextTexts = window.AQT.getContextTextCandidates(element);
    const role = element.getAttribute && element.getAttribute('role');

    for (const text of contextTexts) {
        const escapedText = window.AQT.escapeXpathValue(text);
        const rolePredicate = role ? ` and @role=${window.AQT.escapeXpathValue(role)}` : '';
        const xpath = `//*[normalize-space()=${escapedText}]/ancestor::*[self::label or self::div or self::span][1]//${tag}${rolePredicate}`;

        const count = document.evaluate(
            `count(${xpath})`,
            document,
            null,
            XPathResult.NUMBER_TYPE,
            null
        ).numberValue;

        if (count === 1) {
            return {
                value: xpath,
                strategy: 'context-text',
                stability: 'medium',
                text
            };
        }

        const antSelectXpath = `//*[normalize-space()=${escapedText}]/ancestor::*[contains(@class, 'ant-select') or contains(@class, 'ant-select-selector')][1]//${tag}${rolePredicate}`;
        const antSelectCount = document.evaluate(
            `count(${antSelectXpath})`,
            document,
            null,
            XPathResult.NUMBER_TYPE,
            null
        ).numberValue;

        if (antSelectCount === 1) {
            return {
                value: antSelectXpath,
                strategy: 'context-text',
                stability: 'medium',
                text
            };
        }
    }

    return null;
};

window.AQT.getDynamicIdMeta = function (elementInfo, tag) {
    if (!elementInfo || !elementInfo.id) {
        return null;
    }

    const escapedId = window.AQT.escapeCssIdentifier(elementInfo.id);
    const escapedXpath = window.AQT.escapeXpathValue(elementInfo.id);
    const escapedJs = window.AQT.escapeJsSingleQuotedString(elementInfo.id);

    return {
        css: {
            value: `#${escapedId}`,
            strategy: 'id',
            stability: 'weak',
            hint: 'Dynamic id detected; keep as backup locator.'
        },
        xpath: {
            value: `//${tag}[@id=${escapedXpath}]`,
            strategy: 'id',
            stability: 'weak',
            hint: 'Dynamic id detected; keep as backup locator.'
        },
        selenideCss: {
            value: `$("#${escapedJs}")`,
            strategy: 'id',
            stability: 'weak',
            hint: 'Dynamic id detected; keep as backup locator.'
        },
        selenideXpath: {
            value: `$x("//${tag}[@id=${escapedXpath}]")`,
            strategy: 'id',
            stability: 'weak',
            hint: 'Dynamic id detected; keep as backup locator.'
        },
        playwright: {
            value: `page.locator('#${escapedJs}')`,
            strategy: 'id',
            stability: 'weak',
            hint: 'Dynamic id detected; keep as backup locator.'
        }
    };
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
    if (strategy === "title") score += 32;
    if (strategy === "href") score += 30;
    if (strategy === "text") score += 25;
    if (strategy === "text-contains") score += 23;
    if (strategy === "context-text") score += 22;
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

    let xpathTextAlternative = "";
    let selenideXpathTextAlternative = "";
    let playwrightTextAlternative = "";
    let contextualHint = "";
    const ancestorAlternatives = window.AQT.getAncestorAlternativeCandidates(element);
    const textAlternatives = window.AQT.getTextAlternativeCandidates(element, tag);
    const qaAncestorAlternatives = window.AQT.getQaAncestorAlternativeCandidates(element);
    const titleMeta = window.AQT.getTitleBasedMeta(element, elementInfo, tag);
    const titleAlternatives = titleMeta ? [
        {
            value: titleMeta.css.value,
            raw: titleMeta.css.value,
            type: "css",
            meta: titleMeta.css,
            label: "Title CSS",
            hint: "Locator based on the title attribute."
        },
        {
            value: titleMeta.xpath.value,
            raw: titleMeta.xpath.value,
            type: "xpath",
            meta: titleMeta.xpath,
            label: "Title XPath",
            hint: "XPath based on the title attribute."
        },
        {
            value: titleMeta.titleOnlyXpath,
            raw: titleMeta.titleOnlyXpath,
            type: "xpath",
            meta: { strategy: "title", stability: "medium" },
            label: "Title-only XPath",
            hint: "XPath using only title on the option wrapper."
        }
    ] : [];

    const qaAttr = window.AQT.getFirstQaAttribute(elementInfo);
    const qaAncestor = window.AQT.getNearestQaAncestor(element);
    const promotedQaAttr = !qaAttr ? qaAncestor?.qaAttr : null;
    const dynamicIdMeta = elementInfo.id && window.AQT.isLikelyGeneratedId(elementInfo.id)
        ? window.AQT.getDynamicIdMeta(elementInfo, tag)
        : null;

    if (qaAttr || promotedQaAttr) {
        const activeQaAttr = qaAttr || promotedQaAttr;
        const escapedCss = window.AQT.escapeCssValue(activeQaAttr.value);
        const escapedXpath = window.AQT.escapeXpathValue(activeQaAttr.value);
        const escapedJs = window.AQT.escapeJsSingleQuotedString(activeQaAttr.value);

        selectorMeta.css = {
            value: `[${activeQaAttr.attr}="${escapedCss}"]`,
            strategy: activeQaAttr.attr,
            stability: "stable"
        };
        selectorMeta.xpath = {
            value: `//*[@${activeQaAttr.attr}=${escapedXpath}]`,
            strategy: activeQaAttr.attr,
            stability: "stable"
        };
        selectorMeta.selenideCss = {
            value: `$('[${activeQaAttr.attr}="${window.AQT.escapeJsSingleQuotedString(activeQaAttr.value)}"]')`,
            strategy: activeQaAttr.attr,
            stability: "stable"
        };
        selectorMeta.selenideXpath = {
            value: `$x("//*[@${activeQaAttr.attr}=${escapedXpath}]")`,
            strategy: activeQaAttr.attr,
            stability: "stable"
        };
        selectorMeta.playwright = {
            value: `page.locator('[${activeQaAttr.attr}="${escapedJs}"]')`,
            strategy: activeQaAttr.attr,
            stability: "stable"
        };

        if (!qaAttr) {
            contextualHint = `Promoted parent attribute: ${activeQaAttr.attr}`;
        }
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

        const textBasedSelectors = window.AQT.getTextBasedSelectors(element, tag);

        if (textBasedSelectors && textBasedSelectors.xpath !== selectorMeta.xpath.value) {
            xpathTextAlternative = textBasedSelectors.xpath;
            selenideXpathTextAlternative = `$x("${textBasedSelectors.xpath}")`;
            playwrightTextAlternative = textBasedSelectors.playwright;
        }
    } else {
        const textBasedSelectors = window.AQT.getTextBasedSelectors(element, tag);

        if (titleMeta) {
            selectorMeta.css = titleMeta.css;
            selectorMeta.xpath = titleMeta.xpath;
            selectorMeta.selenideCss = titleMeta.selenideCss;
            selectorMeta.selenideXpath = titleMeta.selenideXpath;
            selectorMeta.playwright = titleMeta.playwright;
        } else if (textBasedSelectors) {
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
        } else {
            const contextualXpath = window.AQT.getContextualXpathMeta(element, tag);

            if (contextualXpath) {
                const cssFallback = window.AQT.getCssFallbackMeta(element, tag);
                const contextText = window.AQT.escapeJsSingleQuotedString(contextualXpath.text);

                selectorMeta.css = {
                    value: cssFallback.value,
                    strategy: cssFallback.strategy,
                    stability: cssFallback.stability
                };
                selectorMeta.xpath = {
                    value: contextualXpath.value,
                    strategy: contextualXpath.strategy,
                    stability: contextualXpath.stability
                };
                selectorMeta.selenideCss = {
                    value: `$("${cssFallback.value}")`,
                    strategy: cssFallback.strategy,
                    stability: cssFallback.stability
                };
                selectorMeta.selenideXpath = {
                    value: `$x("${contextualXpath.value}")`,
                    strategy: contextualXpath.strategy,
                    stability: contextualXpath.stability
                };
                selectorMeta.playwright = {
                    value: elementInfo.role
                        ? `page.getByRole('${window.AQT.escapeJsSingleQuotedString(elementInfo.role)}', { name: '${contextText}', exact: true })`
                        : `page.locator('${window.AQT.escapeJsSingleQuotedString(contextualXpath.value)}')`,
                    strategy: contextualXpath.strategy,
                    stability: contextualXpath.stability
                };
                contextualHint = `Context text: ${contextualXpath.text}`;
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
    }

    if (dynamicIdMeta) {
        selectorMeta.dynamicIdCss = dynamicIdMeta.css;
        selectorMeta.dynamicIdXpath = dynamicIdMeta.xpath;
        selectorMeta.dynamicIdSelenideCss = dynamicIdMeta.selenideCss;
        selectorMeta.dynamicIdSelenideXpath = dynamicIdMeta.selenideXpath;
        selectorMeta.dynamicIdPlaywright = dynamicIdMeta.playwright;
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
        `Playwright [${selectorMeta.playwright.stability}]: ${selectorMeta.playwright.value}` +
        (xpathTextAlternative ? `
XPath (text alt) [medium]: ${xpathTextAlternative}` : "") +
        (selenideXpathTextAlternative ? `
Selenide XPath (text alt) [medium]: ${selenideXpathTextAlternative}` : "") +
        (playwrightTextAlternative ? `
Playwright (text alt) [medium]: ${playwrightTextAlternative}` : "");

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
        xpathTextAlternative,
        selenideXpathTextAlternative,
        playwrightTextAlternative,
        allSelectorsText,
        contextualHint,
        dynamicIdMeta,
        ancestorAlternatives,
        textAlternatives,
        qaAncestorAlternatives,
        titleAlternatives
    };
};

window.AQT.frameworkConfig = {
    selenide: {
        title: "Selenide",
        languages: ["Java"]
    },
    selenium: {
        title: "Selenium",
        languages: ["Java", "Python"]
    },
    webdriverio: {
        title: "WebdriverIO",
        languages: ["TypeScript"]
    },
    playwright: {
        title: "Playwright",
        languages: ["TypeScript", "Python"]
    },
    cypress: {
        title: "CypressJS",
        languages: ["TypeScript"]
    },
    robot: {
        title: "Robot Framework",
        languages: ["SeleniumLibrary", "Browser Library"]
    }
};

window.AQT.getDefaultSettings = function () {
    return {
        framework: "selenide",
        language: "Java"
    };
};

window.AQT.normalizeSettings = function (settings) {
    const defaults = window.AQT.getDefaultSettings();
    const frameworkKey = settings?.framework;
    const framework = window.AQT.frameworkConfig[frameworkKey] ? frameworkKey : defaults.framework;
    const languagePool = window.AQT.frameworkConfig[framework].languages;
    const language = languagePool.includes(settings?.language) ? settings.language : languagePool[0];

    return { framework, language };
};

window.AQT.getFrameworkCandidates = function (selectors, framework) {
    const meta = selectors.selectorMeta || {};
    const candidates = {
        selenide: [
            { value: selectors.selenideCss, raw: selectors.css, type: "css", meta: meta.selenideCss || meta.css },
            { value: selectors.selenideXpath, raw: selectors.xpath, type: "xpath", meta: meta.selenideXpath || meta.xpath },
            selectors.selenideXpathTextAlternative ? { value: selectors.selenideXpathTextAlternative, raw: selectors.xpathTextAlternative, type: "xpath", meta: { stability: "medium", strategy: "text" } } : null
        ],
        selenium: [
            { value: selectors.css, raw: selectors.css, type: "css", meta: meta.css },
            { value: selectors.xpath, raw: selectors.xpath, type: "xpath", meta: meta.xpath },
            selectors.xpathTextAlternative ? { value: selectors.xpathTextAlternative, raw: selectors.xpathTextAlternative, type: "xpath", meta: { stability: "medium", strategy: "text" } } : null
        ],
        webdriverio: [
            { value: selectors.css, raw: selectors.css, type: "css", meta: meta.css },
            { value: selectors.xpath, raw: selectors.xpath, type: "xpath", meta: meta.xpath },
            selectors.xpathTextAlternative ? { value: selectors.xpathTextAlternative, raw: selectors.xpathTextAlternative, type: "xpath", meta: { stability: "medium", strategy: "text" } } : null
        ],
        playwright: [
            { value: selectors.playwright, raw: selectors.css, type: "playwright", meta: meta.playwright },
            selectors.playwrightTextAlternative ? { value: selectors.playwrightTextAlternative, raw: selectors.playwrightTextAlternative, type: "playwright", meta: { stability: "medium", strategy: "text" } } : null,
            { value: selectors.css, raw: selectors.css, type: "css", meta: meta.css }
        ],
        cypress: [
            { value: selectors.css, raw: selectors.css, type: "css", meta: meta.css },
            { value: selectors.xpath, raw: selectors.xpath, type: "xpath", meta: meta.xpath },
            selectors.xpathTextAlternative ? { value: selectors.xpathTextAlternative, raw: selectors.xpathTextAlternative, type: "xpath", meta: { stability: "medium", strategy: "text" } } : null
        ],
        robot: [
            { value: selectors.css, raw: selectors.css, type: "css", meta: meta.css },
            { value: selectors.xpath, raw: selectors.xpath, type: "xpath", meta: meta.xpath }
        ]
    };

    return (candidates[framework] || []).filter(Boolean);
};

window.AQT.normalizeCssAttributeQuotes = function (selector, quoteChar) {
    if (!selector) return "";

    const safeQuote = quoteChar === "'" ? "'" : '"';

    return String(selector).replace(/\[([^=\]]+)=["']([^"'\]]*)["']\]/g, (_match, attr, value) => {
        const normalizedValue = String(value)
            .replace(/\\/g, "\\\\")
            .replace(new RegExp(safeQuote, "g"), `\\${safeQuote}`);

        return `[${attr}=${safeQuote}${normalizedValue}${safeQuote}]`;
    });
};

window.AQT.normalizeXpathAttributeQuotes = function (xpath, quoteChar = "'") {
    if (!xpath) return "";

    const safeQuote = quoteChar === '"' ? '"' : "'";

    return String(xpath).replace(/@([a-zA-Z0-9:_-]+)=["']([^"']*)["']/g, (_match, attr, value) => {
        const normalizedValue = String(value)
            .replace(/\\/g, "\\\\")
            .replace(new RegExp(safeQuote, "g"), `\\${safeQuote}`);

        return `@${attr}=${safeQuote}${normalizedValue}${safeQuote}`;
    });
};

window.AQT.escapeDoubleQuotedSnippet = function (value) {
    if (value == null) return "";

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
};

window.AQT.generalizeXpathTag = function (xpath) {
    if (!xpath) return "";

    return String(xpath).replace(/^\/\/[a-zA-Z][a-zA-Z0-9_-]*/u, "//*");
};

window.AQT.formatFrameworkLocator = function (framework, language, candidate) {
    if (!candidate || !candidate.value) return "";

    const cssRaw = candidate.raw || candidate.value;
    const xpathRaw = candidate.raw || candidate.value;

    const cssJsStyle = window.AQT.normalizeCssAttributeQuotes(cssRaw, '"');
    const cssJvmStyle = window.AQT.normalizeCssAttributeQuotes(cssRaw, "'");
    const xpathCanonical = window.AQT.normalizeXpathAttributeQuotes(xpathRaw, "'");
    const xpathPlaywright = window.AQT.normalizeXpathAttributeQuotes(xpathRaw, '"');
    const xpathCanonicalGeneric = window.AQT.generalizeXpathTag(xpathCanonical);
    const xpathPlaywrightGeneric = window.AQT.generalizeXpathTag(xpathPlaywright);

    const cssSingleQuoted = window.AQT.escapeJsSingleQuotedString(cssJsStyle);
    const xpathSingleQuoted = window.AQT.escapeJsSingleQuotedString(xpathCanonicalGeneric);
    const xpathPlaywrightSingleQuoted = window.AQT.escapeJsSingleQuotedString(xpathPlaywrightGeneric);
    const cssDoubleQuoted = window.AQT.escapeDoubleQuotedSnippet(cssJvmStyle);
    const xpathDoubleQuoted = window.AQT.escapeDoubleQuotedSnippet(xpathCanonicalGeneric);

    if (framework === "selenide") {
        return candidate.type === "xpath"
            ? `$x("${xpathDoubleQuoted}")`
            : `$("${cssDoubleQuoted}")`;
    }

    if (framework === "selenium") {
        if (language === "Python") {
            return candidate.type === "xpath"
                ? `driver.find_element(By.XPATH, "${xpathDoubleQuoted}")`
                : `driver.find_element(By.CSS_SELECTOR, "${cssDoubleQuoted}")`;
        }

        return candidate.type === "xpath"
            ? `driver.findElement(By.xpath("${xpathDoubleQuoted}"));`
            : `driver.findElement(By.cssSelector("${cssDoubleQuoted}"));`;
    }

    if (framework === "webdriverio") {
        return candidate.type === "xpath"
            ? `$("${xpathDoubleQuoted}")`
            : `$('${cssSingleQuoted}')`;
    }

    if (framework === "playwright") {
        if (candidate.type === "playwright") {
            return candidate.value;
        }

        if (language === "Python") {
            return candidate.type === "xpath"
                ? `page.locator('${xpathPlaywrightSingleQuoted}')`
                : `page.locator('${cssSingleQuoted}')`;
        }

        return candidate.type === "xpath"
            ? `page.locator('${xpathPlaywrightSingleQuoted}')`
            : `page.locator('${cssSingleQuoted}')`;
    }

    if (framework === "cypress") {
        return candidate.type === "xpath"
            ? `cy.xpath('${xpathPlaywrightSingleQuoted}')`
            : `cy.get('${cssSingleQuoted}')`;
    }

    if (framework === "robot") {
        if (language === "Browser Library") {
            return candidate.type === "xpath"
                ? `xpath=${xpathPlaywrightGeneric}`
                : `css=${cssJsStyle}`;
        }

        return candidate.type === "xpath"
            ? `xpath:${xpathCanonicalGeneric}`
            : `css:${cssJvmStyle}`;
    }


    return candidate.value;
};

window.AQT.extractAttributeValue = function (selector, attributeName) {
    if (!selector || !attributeName) return "";

    const value = String(selector);
    const cssDoubleStart = `[${attributeName}="`;
    const cssSingleStart = `[${attributeName}='`;
    const xpathDoubleStart = `@${attributeName}="`;
    const xpathSingleStart = `@${attributeName}='`;

    const extractByStart = (startToken, endToken) => {
        const startIndex = value.indexOf(startToken);

        if (startIndex < 0) return "";

        const contentStart = startIndex + startToken.length;
        const endIndex = value.indexOf(endToken, contentStart);

        if (endIndex < 0) return "";

        return value.slice(contentStart, endIndex);
    };

    return (
        extractByStart(cssDoubleStart, '"]')
        || extractByStart(cssSingleStart, "']")
        || extractByStart(xpathDoubleStart, '"')
        || extractByStart(xpathSingleStart, "'")
    );
};

window.AQT.getAlternativeCandidates = function (settings, selectors, orderedCandidates, primaryCandidate) {
    const alternatives = orderedCandidates
        .filter((candidate) => candidate.value !== primaryCandidate.value)
        .map((candidate) => ({
            ...candidate,
            label: candidate.label || (candidate.type === "xpath" ? "XPath" : "Alternative"),
            hint: settings.framework === "cypress" && candidate.type === "xpath"
                ? "Requires cypress-xpath plugin"
                : candidate.hint
        }));

    const ancestorAlternatives = (selectors.ancestorAlternatives || [])
        .filter((candidate) => candidate.value && candidate.value !== primaryCandidate.value)
        .map((candidate) => ({
            ...candidate,
            hint: settings.framework === "cypress" && candidate.type === "xpath"
                ? "Requires cypress-xpath plugin"
                : candidate.hint
        }));

    const textAlternatives = (selectors.textAlternatives || [])
        .filter((candidate) => candidate.value && candidate.value !== primaryCandidate.value)
        .map((candidate) => ({
            ...candidate,
            hint: settings.framework === "cypress" && candidate.type === "xpath"
                ? "Requires cypress-xpath plugin"
                : candidate.hint
        }));

    const qaAncestorAlternatives = (selectors.qaAncestorAlternatives || [])
        .filter((candidate) => candidate.value && candidate.value !== primaryCandidate.value)
        .map((candidate) => ({
            ...candidate,
            hint: settings.framework === "cypress" && candidate.type === "xpath"
                ? "Requires cypress-xpath plugin"
                : candidate.hint
        }));

    const titleAlternatives = (selectors.titleAlternatives || [])
        .filter((candidate) => candidate.value && candidate.value !== primaryCandidate.value)
        .map((candidate) => ({
            ...candidate,
            hint: settings.framework === "cypress" && candidate.type === "xpath"
                ? "Requires cypress-xpath plugin"
                : candidate.hint
        }));

    alternatives.push(...ancestorAlternatives, ...textAlternatives, ...qaAncestorAlternatives, ...titleAlternatives);

    if (settings.framework === "playwright") {
        if (selectors.xpath) {
            alternatives.push({
                type: "xpath",
                raw: selectors.xpath,
                value: selectors.xpath,
                meta: selectors.selectorMeta?.xpath || { strategy: "xpath", stability: "medium" },
                label: "XPath"
            });
        }

        const testIdValue = window.AQT.extractAttributeValue(selectors.css, "data-testid")
            || window.AQT.extractAttributeValue(selectors.xpath, "data-testid");

        if (testIdValue) {
            const escapedTestId = window.AQT.escapeJsSingleQuotedString(testIdValue);

            alternatives.push({
                type: "playwright",
                raw: `page.getByTestId('${escapedTestId}')`,
                value: `page.getByTestId('${escapedTestId}')`,
                meta: { strategy: "data-testid", stability: "stable" },
                label: "getByTestId",
                hint: "Playwright best practice"
            });
        }

        if (selectors.playwrightTextAlternative) {
            alternatives.push({
                type: "playwright",
                raw: selectors.playwrightTextAlternative,
                value: selectors.playwrightTextAlternative,
                meta: { strategy: "text", stability: "medium" },
                label: "Text locator"
            });
        }
    }

    const dynamicIdCandidateMap = {
        selenide: selectors.dynamicIdMeta?.css ? { raw: selectors.dynamicIdMeta.css.value, value: selectors.dynamicIdMeta.css.value, type: 'css', meta: selectors.dynamicIdMeta.css, label: 'Dynamic id', hint: selectors.dynamicIdMeta.css.hint } : null,
        selenium: selectors.dynamicIdMeta?.css ? { raw: selectors.dynamicIdMeta.css.value, value: selectors.dynamicIdMeta.css.value, type: 'css', meta: selectors.dynamicIdMeta.css, label: 'Dynamic id', hint: selectors.dynamicIdMeta.css.hint } : null,
        webdriverio: selectors.dynamicIdMeta?.css ? { raw: selectors.dynamicIdMeta.css.value, value: selectors.dynamicIdMeta.css.value, type: 'css', meta: selectors.dynamicIdMeta.css, label: 'Dynamic id', hint: selectors.dynamicIdMeta.css.hint } : null,
        playwright: selectors.dynamicIdMeta?.playwright ? { raw: selectors.dynamicIdMeta.playwright.value, value: selectors.dynamicIdMeta.playwright.value, type: 'playwright', meta: selectors.dynamicIdMeta.playwright, label: 'Dynamic id', hint: selectors.dynamicIdMeta.playwright.hint } : null,
        cypress: selectors.dynamicIdMeta?.css ? { raw: selectors.dynamicIdMeta.css.value, value: selectors.dynamicIdMeta.css.value, type: 'css', meta: selectors.dynamicIdMeta.css, label: 'Dynamic id', hint: selectors.dynamicIdMeta.css.hint } : null,
        robot: selectors.dynamicIdMeta?.css ? { raw: selectors.dynamicIdMeta.css.value, value: selectors.dynamicIdMeta.css.value, type: 'css', meta: selectors.dynamicIdMeta.css, label: 'Dynamic id', hint: selectors.dynamicIdMeta.css.hint } : null
    };

    const dynamicIdCandidate = dynamicIdCandidateMap[settings.framework];

    if (dynamicIdCandidate && !alternatives.some((candidate) => candidate.value === dynamicIdCandidate.value)) {
        alternatives.unshift(dynamicIdCandidate);
    }

    const uniqueAlternatives = alternatives.filter((candidate, index, list) => (
        candidate?.value && list.findIndex((item) => item.value === candidate.value) === index
    ));

    const rankAlternative = (candidate) => {
        const strategy = candidate.meta?.strategy || "";
        const stability = window.AQT.stabilityRank(candidate.meta?.stability) * 100;
        let score = stability;

        if (candidate.label === "Dynamic id") score += 500;
        if (strategy === "id") score += 120;
        if (strategy === "title") score += 70;
        if (strategy === "role+name" || strategy === "aria-label") score += 65;
        if (strategy === "text") score += 55;
        if (strategy === "text-contains") score += 45;
        if (strategy === "context-text") score += 50;
        if (strategy === "class") score += 20;
        if (strategy === "class*") score += 10;
        if (strategy === "tag+nth") score -= 150;

        return score;
    };

    const sortedAlternatives = uniqueAlternatives
        .sort((first, second) => rankAlternative(second) - rankAlternative(first));

    const meaningfulAlternatives = sortedAlternatives
        .filter((candidate) => candidate.meta?.strategy !== "tag+nth");

    const requiredTextAlternatives = meaningfulAlternatives.filter((candidate) => (
        candidate.label === "XPath exact text" || candidate.label === "XPath contains text"
    ));

    const mergeRequiredAlternatives = (pool, limit) => {
        const merged = [];

        requiredTextAlternatives.forEach((candidate) => {
            if (!merged.some((item) => item.value === candidate.value)) {
                merged.push(candidate);
            }
        });

        pool.forEach((candidate) => {
            if (merged.length >= limit) {
                return;
            }

            if (!merged.some((item) => item.value === candidate.value)) {
                merged.push(candidate);
            }
        });

        return merged.slice(0, limit);
    };

    if (meaningfulAlternatives.length >= 3) {
        return mergeRequiredAlternatives(meaningfulAlternatives, 6);
    }

    return mergeRequiredAlternatives(sortedAlternatives, 6);
};

window.AQT.getFrameworkLocatorModel = function (selectors, rawSettings) {
    const settings = window.AQT.normalizeSettings(rawSettings);
    const candidates = window.AQT.getFrameworkCandidates(selectors, settings.framework);

    const ordered = [...candidates].sort((a, b) => {
        const stabilityDiff = window.AQT.stabilityRank(b.meta?.stability) - window.AQT.stabilityRank(a.meta?.stability);
        if (stabilityDiff !== 0) return stabilityDiff;
        return window.AQT.strategyRank(b.meta?.strategy) - window.AQT.strategyRank(a.meta?.strategy);
    });

    const primaryCandidate = ordered[0] || { value: selectors.recommendedSelector || selectors.css || selectors.xpath, raw: selectors.recommendedSelector, type: "css", meta: { stability: selectors.stability, strategy: selectors.strategy }, label: "Primary" };
    const alternativeCandidates = window.AQT.getAlternativeCandidates(settings, selectors, ordered, primaryCandidate);

    const primary = window.AQT.formatFrameworkLocator(settings.framework, settings.language, primaryCandidate);
    const alternatives = alternativeCandidates
        .map((candidate) => ({
            label: candidate.label,
            hint: candidate.hint,
            snippet: window.AQT.formatFrameworkLocator(settings.framework, settings.language, candidate)
        }))
        .filter((item) => item.snippet && item.snippet !== primary)
        .filter((item, index, list) => list.findIndex((entry) => entry.snippet === item.snippet) === index);

    return {
        settings,
        frameworkTitle: window.AQT.frameworkConfig[settings.framework].title,
        primary,
        primaryHint: settings.framework === "cypress" && primaryCandidate.type === "xpath"
            ? "Requires cypress-xpath plugin"
            : selectors.contextualHint || "",
        alternatives,
        strategy: primaryCandidate.meta?.strategy || selectors.strategy,
        stability: primaryCandidate.meta?.stability || selectors.stability
    };
};
