window.AQT = window.AQT || {};

window.AQT.pickerState = {
    active: false,
    highlightedElement: null
};

window.AQT.isToolkitUiElement = function (element) {
    if (!element || !element.closest) return false;
    return Boolean(element.closest("#aqt-floating-panel") || element.closest("#aqt-toast"));
};

window.AQT.startPicker = function () {
    const state = window.AQT.pickerState;

    if (state.active) {
        return;
    }

    state.active = true;

    document.addEventListener("mouseover", window.AQT.highlightElement);
    document.addEventListener("click", window.AQT.selectElement, true);
};

window.AQT.stopPicker = function () {
    const state = window.AQT.pickerState;

    state.active = false;

    document.removeEventListener("mouseover", window.AQT.highlightElement);
    document.removeEventListener("click", window.AQT.selectElement, true);

    if (state.highlightedElement) {
        state.highlightedElement.style.outline = "";
        state.highlightedElement.style.outlineOffset = "";
        state.highlightedElement = null;
    }
};

window.AQT.highlightElement = function (event) {
    const state = window.AQT.pickerState;

    if (!state.active || window.AQT.isToolkitUiElement(event.target)) return;

    if (state.highlightedElement && state.highlightedElement !== event.target) {
        state.highlightedElement.style.outline = "";
        state.highlightedElement.style.outlineOffset = "";
    }

    state.highlightedElement = window.AQT.getBestTarget(event.target);
    state.highlightedElement.style.outline = "2px solid #ff4d4f";
    state.highlightedElement.style.outlineOffset = "2px";
};

window.AQT.selectElement = async function (event) {
    const state = window.AQT.pickerState;

    if (!state.active || window.AQT.isToolkitUiElement(event.target)) return;

    event.preventDefault();
    event.stopPropagation();

    const originalElement = event.target;
    const targetElement = window.AQT.getBestTarget(originalElement);

    const originalInfo = window.AQT.buildElementInfo(originalElement);
    const originalSelectors = window.AQT.generateSelectors(originalInfo, originalElement);

    const targetInfo = window.AQT.buildElementInfo(targetElement);
    const targetSelectors = window.AQT.generateSelectors(targetInfo, targetElement);

    const selectedCandidate = window.AQT.pickBetterSelectorCandidate(
        { selectors: targetSelectors, sourceElement: targetElement },
        { selectors: originalSelectors, sourceElement: originalElement }
    );

    const selectors = selectedCandidate?.selectors || targetSelectors;

    await chrome.storage.local.set({
        lastSelectedElement: selectors
    });

    window.AQT.stopPicker();
    window.AQT.showToast(`Selector saved: ${selectors.strategy}`);
    await window.AQT.showFloatingPanel(selectors);
};
