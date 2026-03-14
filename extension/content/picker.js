window.AQT = window.AQT || {};

window.AQT.pickerState = {
    active: false,
    highlightedElement: null
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

    if (!state.active) return;

    if (state.highlightedElement && state.highlightedElement !== event.target) {
        state.highlightedElement.style.outline = "";
        state.highlightedElement.style.outlineOffset = "";
    }

    state.highlightedElement = window.AQT.getBestTarget(event.target);
    state.highlightedElement.style.outline = "2px solid #ff4d4f";
    state.highlightedElement.style.outlineOffset = "2px";
};

window.AQT.selectElement = function (event) {
    const state = window.AQT.pickerState;

    if (!state.active) return;

    event.preventDefault();
    event.stopPropagation();

    const element = window.AQT.getBestTarget(event.target);
    const elementInfo = window.AQT.buildElementInfo(element);
    const selectors = window.AQT.generateSelectors(elementInfo);

    chrome.storage.local.set({
        lastSelectedElement: selectors
    });

    window.AQT.stopPicker();
    window.AQT.showToast(`Selector saved: ${selectors.strategy}`);
    window.AQT.showFloatingPanel(selectors);
};