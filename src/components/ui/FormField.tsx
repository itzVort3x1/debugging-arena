import { Input, type InputProps } from "./Input";
import { Label } from "./Label";
import { PasswordInput } from "./PasswordInput";

export interface FormFieldProps extends InputProps {
    /** Used for both the input `id` and the label's `htmlFor`. */
    id: string;
    label: string;
    /** Optional muted hint shown opposite the label. */
    hint?: string;
}

/**
 * A labelled input: the {@link Label} header row plus an {@link Input}
 * (or {@link PasswordInput} when `type="password"`). This is the building
 * block the auth forms compose their fields from.
 */
export function FormField({ id, label, hint, type, ...rest }: FormFieldProps) {
    return (
        <div>
            <Label htmlFor={id} hint={hint}>
                {label}
            </Label>
            {type === "password" ? (
                <PasswordInput id={id} {...rest} />
            ) : (
                <Input id={id} type={type} {...rest} />
            )}
        </div>
    );
}
