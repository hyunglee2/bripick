import { ProfileContact, ProfileData } from "@/types/resume";

const LEGACY_CONTACTS: Array<{
    key: "email" | "phone" | "blog" | "github";
    label: string;
}> = [
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "blog", label: "Blog" },
    { key: "github", label: "GitHub" },
];

export function getProfileContacts(data: Partial<ProfileData>): ProfileContact[] {
    if (Array.isArray(data.contacts)) {
        return data.contacts.map((contact, index, contacts) => ({
            ...contact,
            inlineWithPrevious: contact.inlineWithPrevious ?? (
                index > 0
                && /^github$/i.test(contact.label.trim())
                && /^(blog|블로그)$/i.test(contacts[index - 1].label.trim())
            ),
        }));
    }

    return LEGACY_CONTACTS.flatMap(({ key, label }) => {
        const value = data[key];
        return typeof value === "string" && value.trim()
            ? [{
                id: `contact-${key}`,
                label,
                value,
                inlineWithPrevious: key === "github",
            }]
            : [];
    });
}

export function withProfileContacts(
    data: ProfileData,
    contacts: ProfileContact[],
): ProfileData {
    const findValue = (pattern: RegExp) =>
        contacts.find((contact) => pattern.test(contact.label.trim()))?.value || "";

    return {
        ...data,
        contacts,
        email: findValue(/^(e-?mail|이메일)$/i),
        phone: findValue(/^(phone|mobile|tel|연락처|전화|휴대폰)$/i),
        blog: findValue(/^(blog|블로그)$/i),
        github: findValue(/^github$/i),
    };
}

/**
 * 연락처 값이 웹 주소면 링크 주소를 돌려준다. "github.com/name"처럼 프로토콜이 없으면 https://를 붙인다.
 * 이메일·전화번호처럼 주소가 아닌 값은 null.
 */
export function getContactHref(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed || /\s/.test(trimmed)) return null;
    if (/^https?:\/\/[^/]+\.[^/]+/i.test(trimmed)) return trimmed;
    if (trimmed.includes("@")) return null;
    if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(trimmed)) return `https://${trimmed}`;
    return null;
}
