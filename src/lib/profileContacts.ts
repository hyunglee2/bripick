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
