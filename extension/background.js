console.log("Automation QA Toolkit background loaded");

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "capture-screenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" })
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});