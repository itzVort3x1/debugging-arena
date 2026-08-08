/** The minimal identity fields we render for a signed-in user. */
export interface DisplayUser {
    name: string | null;
    email: string | null;
    /** Stored avatar URL, if one has been uploaded. */
    image?: string | null;
}

/**
 * Best available human label for a user: their name, falling back to email,
 * then a generic "Account". Shared by the nav chip, the dropdown, and the
 * dashboard header so the label stays consistent everywhere.
 */
export function displayName(user: DisplayUser): string {
    return user.name ?? user.email ?? "Account";
}
