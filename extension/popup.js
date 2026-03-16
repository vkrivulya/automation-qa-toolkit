const startPickerButton = document.getElementById("startPicker");
const frameworkSelect = document.getElementById("frameworkSelect");
const languageSelect = document.getElementById("languageSelect");
const frameworkHint = document.getElementById("frameworkHint");

const FRAMEWORKS = [
    {
        id: "selenide",
        title: "Selenide",
        languages: ["Java"],
        description: "Fluent selectors for Selenide tests."
    },
    {
        id: "selenium",
        title: "Selenium",
        languages: ["Java", "Python"],
        description: "Classic WebDriver format for Selenium projects."
    },
    {
        id: "webdriverio",
        title: "WebdriverIO",
        languages: ["TypeScript"],
        description: "WDIO element access for JS/TS stacks."
    },
    {
        id: "playwright",
        title: "Playwright",
        languages: ["TypeScript", "Python"],
        description: "Playwright-native locator snippets."
    },
    {
        id: "cypress",
        title: "CypressJS",
        languages: ["TypeScript"],
        description: "Cypress-ready locators for fast e2e tests."
    },
    {
        id: "robot",
        title: "Robot Framework",
        languages: ["Robot Framework"],
        description: "Keywords for BrowserLibrary / SeleniumLibrary."
    }
];

const DEFAULT_SETTINGS = {
    framework: "selenide",
    language: "Java"
};

function getFrameworkById(id) {
    return FRAMEWORKS.find((item) => item.id === id) || FRAMEWORKS[0];
}

function populateFrameworks(selectedFrameworkId) {
    frameworkSelect.innerHTML = FRAMEWORKS
        .map((framework) => `<option value="${framework.id}">${framework.title}</option>`)
        .join("");

    frameworkSelect.value = getFrameworkById(selectedFrameworkId).id;
}

function populateLanguages(frameworkId, selectedLanguage) {
    const framework = getFrameworkById(frameworkId);

    languageSelect.innerHTML = framework.languages
        .map((language) => `<option value="${language}">${language}</option>`)
        .join("");

    const nextLanguage = framework.languages.includes(selectedLanguage)
        ? selectedLanguage
        : framework.languages[0];

    languageSelect.value = nextLanguage;
    frameworkHint.textContent = framework.description;
}

async function saveSettings() {
    await chrome.storage.local.set({
        aqtSettings: {
            framework: frameworkSelect.value,
            language: languageSelect.value
        }
    });
}

frameworkSelect.addEventListener("change", async () => {
    populateLanguages(frameworkSelect.value, languageSelect.value);
    await saveSettings();
});

languageSelect.addEventListener("change", saveSettings);

startPickerButton.addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs[0]?.id) {
        return;
    }

    await saveSettings();
    await chrome.tabs.sendMessage(tabs[0].id, { action: "start-picker" });

    window.close();
});

document.addEventListener("DOMContentLoaded", async () => {
    const data = await chrome.storage.local.get("aqtSettings");
    const saved = data.aqtSettings || DEFAULT_SETTINGS;

    const framework = getFrameworkById(saved.framework);
    const language = framework.languages.includes(saved.language)
        ? saved.language
        : framework.languages[0];

    populateFrameworks(framework.id);
    populateLanguages(framework.id, language);

    await chrome.storage.local.set({
        aqtSettings: {
            framework: framework.id,
            language
        }
    });
});
