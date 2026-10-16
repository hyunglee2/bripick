export function formatBlockTitle(title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle !== trimmedTitle.toUpperCase()) return title;

    return trimmedTitle
        .toLocaleLowerCase("en-US")
        .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}
