"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function BookingSuccessToast() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast.success("Booking request submitted", {
      description: "It is now pending manager approval - you pay only after approval.",
    });
  }, []);
  return null;
}
