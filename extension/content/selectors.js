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

window.AQT.generateSelectors = function (elementInfo) {
    let css = "";
    let selenide = "";
    let playwright = "";
    let strategy = "";

    if (elementInfo.dataE2e) {
        css = `[data-e2e="${elementInfo.dataE2e}"]`;
        selenide = `$("[data-e2e='${elementInfo.dataE2e}']")`;
        playwright = `page.locator('[data-e2e="${elementInfo.dataE2e}"]')`;
        strategy = "data-e2e";
    } else if (elementInfo.dataTestId) {
        css = `[data-testid="${elementInfo.dataTestId}"]`;
        selenide = `$("[data-testid='${elementInfo.dataTestId}']")`;
        playwright = `page.locator('[data-testid="${elementInfo.dataTestId}"]')`;
        strategy = "data-testid";
    } else if (elementInfo.dataTest) {
        css = `[data-test="${elementInfo.dataTest}"]`;
        selenide = `$("[data-test='${elementInfo.dataTest}']")`;
        playwright = `page.locator('[data-test="${elementInfo.dataTest}"]')`;
        strategy = "data-test";
    } else if (elementInfo.id) {
        css = `#${elementInfo.id}`;
        selenide = `$("#${elementInfo.id}")`;
        playwright = `page.locator('#${elementInfo.id}')`;
        strategy = "id";
    } else if (elementInfo.name) {
        css = `[name="${elementInfo.name}"]`;
        selenide = `$("[name='${elementInfo.name}']")`;
        playwright = `page.locator('[name="${elementInfo.name}"]')`;
        strategy = "name";
    } else {
        const tag = elementInfo.tag ? elementInfo.tag.toLowerCase() : "*";
        css = tag;
        selenide = `$("${tag}")`;
        playwright = `page.locator('${tag}')`;
        strategy = "tag";
    }

    return {
        strategy,
        css,
        selenide,
        playwright
    };
};