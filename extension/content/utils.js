window.AQT = window.AQT || {};

window.AQT.escapeHtml = function (value) {
    if (value == null) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
};

window.AQT.escapeAttribute = function (value) {
    if (value == null) return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
};

window.AQT.downloadTextFile = function (filename, content) {
    var blob = new Blob([content], { type: "text/markdown; charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
};

window.AQT.copyToClipboard = function (text) {
    return navigator.clipboard.writeText(text);
};