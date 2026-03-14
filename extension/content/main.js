window.AQT = window.AQT || {};

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "start-picker") {
        window.AQT.startPicker();
    }
});