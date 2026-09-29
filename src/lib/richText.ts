export function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function sanitizeInlineRichText(value: string) {
    return value
        .replace(/<\s*b(?:\s[^>]*)?>/gi, "<strong>")
        .replace(/<\s*\/\s*b\s*>/gi, "</strong>")
        .replace(/<\s*strong(?:\s[^>]*)?>/gi, "<strong>")
        .replace(/<\s*\/\s*strong\s*>/gi, "</strong>")
        .replace(/<\s*br\s*\/?>/gi, "<br>")
        .replace(/<(?!\/?strong\b|br\b)[^>]*>/gi, "");
}

export function richTextToPlainText(value: string) {
    if (typeof document !== "undefined") {
        const element = document.createElement("div");
        element.innerHTML = sanitizeInlineRichText(value);
        return element.textContent || "";
    }
    return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}
