export function escapeTextFormat(text: string): string {
    return text.replace(/([_\\*~])/g, "\\$1");
}