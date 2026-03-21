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

window.AQT.getPointerTarget = function (event) {
    if (!event) {
        return null;
    }

    const elementsAtPoint = document.elementsFromPoint
        ? document.elementsFromPoint(event.clientX, event.clientY)
        : [];

    const pointerCandidate = elementsAtPoint.find((element) => element && !window.AQT.isToolkitUiElement(element));

    return pointerCandidate || event.target || null;
};

window.AQT.highlightElement = function (event) {
    const state = window.AQT.pickerState;

    const pointerTarget = window.AQT.getPointerTarget(event);

    if (!state.active || window.AQT.isToolkitUiElement(pointerTarget)) return;

    if (state.highlightedElement && state.highlightedElement !== pointerTarget) {
        state.highlightedElement.style.outline = "";
        state.highlightedElement.style.outlineOffset = "";
    }

    state.highlightedElement = window.AQT.getBestTarget(pointerTarget);
    if (!state.highlightedElement) return;
    state.highlightedElement.style.outline = "2px solid #ff4d4f";
    state.highlightedElement.style.outlineOffset = "2px";
};

window.AQT.selectElement = async function (event) {
    const state = window.AQT.pickerState;

    const pointerTarget = window.AQT.getPointerTarget(event);

    if (!state.active || window.AQT.isToolkitUiElement(pointerTarget)) return;

    event.preventDefault();
    event.stopPropagation();

    const originalElement = pointerTarget;
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
