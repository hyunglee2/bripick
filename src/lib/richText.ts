export function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function sanitizeInlineRichText(value: string) {
    const sanitizeHref = (href: string) => {
        const decodedHref = href.replace(/&amp;/gi, "&").trim();
        if (!/^(https?:\/\/|mailto:)/i.test(decodedHref)) return "";
        return decodedHref
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    };

    return value
        .replace(/<\s*b(?:\s[^>]*)?>/gi, "<strong>")
        .replace(/<\s*\/\s*b\s*>/gi, "</strong>")
        .replace(/<\s*strong(?:\s[^>]*)?>/gi, "<strong>")
        .replace(/<\s*\/\s*strong\s*>/gi, "</strong>")
        .replace(/<\s*u(?:\s[^>]*)?>/gi, "<u>")
        .replace(/<\s*\/\s*u\s*>/gi, "</u>")
        .replace(/<\s*a\b([^>]*)>/gi, (_tag, attributes: string) => {
            const hrefMatch = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
            const href = sanitizeHref(hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || "");
            return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">` : "";
        })
        .replace(/<\s*\/\s*a\s*>/gi, "</a>")
        .replace(/<\s*br\s*\/?>/gi, "<br>")
        .replace(/<(?!\/?strong\b|\/?u\b|\/?a\b|br\b)[^>]*>/gi, "");
}

export function richTextToPlainText(value: string) {
    if (typeof document !== "undefined") {
        const element = document.createElement("div");
        element.innerHTML = sanitizeInlineRichText(value);
        return element.textContent || "";
    }
    return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}
