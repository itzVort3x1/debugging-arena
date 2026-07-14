import type { ReactNode } from "react";
import { AvatarUpload } from "./AvatarUpload";

/**
 * Left-column identity card: an editable avatar plus name/username, with room
 * for sidebar sections (Languages, etc.) passed as children.
 */
export function ProfileSidebar({
    label,
    name,
    username,
    children,
}: {
    label: string;
    name: string;
    username: string | null;
    children?: ReactNode;
}) {
    return (
        <aside className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left">
                <AvatarUpload label={label} size={80} />
                <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold tracking-tight text-vscode-fg">
                        {name}
                    </h1>
                    {username ? (
                        <p className="truncate text-sm text-vscode-fg-muted">
                            {username}
                        </p>
                    ) : null}
                </div>
            </div>
            {children}
        </aside>
    );
}
