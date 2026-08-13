"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password input with a show/hide toggle. The native input keeps the same
 * `name`/`id` props as a plain <Input>, so server actions and label lookups
 * (getByLabel in tests) work unchanged - only the `type` flips between
 * password and text.
 *
 * Focus is preserved on toggle (`mousedown` preventDefault) so the field does
 * not blur, dismiss the keyboard, or flash when the eye is clicked.
 */
function PasswordInput({
  className,
  disabled,
  ...props
}: React.ComponentProps<"input">) {
  const [show, setShow] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = props.id;

  function toggleVisibility() {
    setShow((visible) => !visible);
    // Keep caret in the field after React commits the type change.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el || disabled) return;
      el.focus({ preventScroll: true });
      try {
        const end = el.value.length;
        el.setSelectionRange(end, end);
      } catch {
        // setSelectionRange throws on some input types in older engines.
      }
    });
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        disabled={disabled}
        className={cn(
          "pr-9",
          // Hide Edge/IE built-in reveal so it does not stack with our toggle.
          "[&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
        )}
        {...props}
        // Always win over a stray `type` in props.
        type={show ? "text" : "password"}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        // Keep focus on the input (mouse only; pointerdown can cancel clicks).
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleVisibility}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        aria-controls={inputId}
        title={show ? "Hide password" : "Show password"}
        className={cn(
          "absolute top-1/2 right-1 z-10 -translate-y-1/2",
          "text-muted-foreground hover:text-foreground",
          // Kill press scale/translate so the control does not "jump".
          "active:translate-y-0 active:scale-100",
        )}
      >
        {show ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}

export { PasswordInput };
