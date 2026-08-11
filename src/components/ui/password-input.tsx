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
 * password and text while the user holds the eye button's state.
 */
function PasswordInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  const [show, setShow] = React.useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input
        type={show ? "text" : "password"}
        className="pr-9"
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setShow((visible) => !visible)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        title={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

export { PasswordInput };
