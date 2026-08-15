"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/admin/form-select";
import { hostelFormAction, type HostelFormState } from "@/lib/actions/hostel";

const initial: HostelFormState = {};

const FACILITIES = ["Wi-Fi", "Water", "Security", "Study Rooms", "Power Backup"];

export type HostelDraft = {
  id: string;
  name: string;
  type: "UNIVERSITY" | "PRIVATE";
  location: string;
  contactNumber: string | null;
  description: string | null;
  facilities: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function HostelDialog({ hostel }: { hostel?: HostelDraft | null }) {
  const isEdit = Boolean(hostel);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    hostelFormAction,
    initial,
  );
  const [type, setType] = useState<"UNIVERSITY" | "PRIVATE">(
    hostel?.type ?? "UNIVERSITY",
  );

  const initialFacilities = new Set(
    (hostel?.facilities ?? "")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean),
  );

  // Close after a successful save (the action revalidates the page).
  useEffect(() => {
    if (state.ok) {
      toast.success(isEdit ? "Hostel updated" : "Hostel added", {
        description: isEdit
          ? undefined
          : "It stays hidden from students until you publish it.",
      });
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, isEdit]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={isEdit ? "outline" : "default"} />
        }
      >
        {isEdit ? "Edit" : "Add hostel"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit hostel" : "Add a new hostel"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details below. Publishing is controlled separately."
              : "New hostels are hidden from students until an administrator publishes them."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
      <CsrfInput />
          {isEdit && <input type="hidden" name="hostelId" value={hostel!.id} />}
          {state.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="hostel-name">Hostel name</Label>
            <Input
              id="hostel-name"
              name="name"
              defaultValue={hostel?.name}
              placeholder="e.g. Al-Hassan Hostel"
              required
            />
          </div>

          <FormSelect
            id="hostel-type"
            label="Category"
            name="type"
            value={type}
            onChange={(v) => setType(v as "UNIVERSITY" | "PRIVATE")}
            options={[
              { value: "UNIVERSITY", label: "ATU On-Campus" },
              { value: "PRIVATE", label: "Private Perimeter" },
            ]}
          />

          <div className="space-y-1.5">
            <Label htmlFor="hostel-location">
              Location / address around Adabraka
            </Label>
            <Input
              id="hostel-location"
              name="location"
              defaultValue={hostel?.location}
              placeholder="e.g. Bubuashie, near ATU"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hostel-contact">Contact number (optional)</Label>
            <Input
              id="hostel-contact"
              name="contactNumber"
              defaultValue={hostel?.contactNumber ?? ""}
              placeholder="e.g. 020 000 0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="hostel-lat">Latitude (optional)</Label>
              <Input
                id="hostel-lat"
                name="latitude"
                type="number"
                step="any"
                defaultValue={hostel?.latitude ?? ""}
                placeholder="e.g. 5.5629"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hostel-lng">Longitude (optional)</Label>
              <Input
                id="hostel-lng"
                name="longitude"
                type="number"
                step="any"
                defaultValue={hostel?.longitude ?? ""}
                placeholder="e.g. -0.2219"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Coordinates pin the hostel on the student map (Adabraka is roughly
            5.5629, -0.2219). Leave blank to hide it from the map view.
          </p>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Available facilities</legend>
            <div className="grid grid-cols-2 gap-2">
              {FACILITIES.map((facility) => (
                <label
                  key={facility}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-checked:border-primary/60 has-checked:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    name="facilities"
                    value={facility}
                    defaultChecked={initialFacilities.has(facility)}
                    className="size-4 accent-primary"
                  />
                  {facility}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="hostel-description">Description (optional)</Label>
            <Input
              id="hostel-description"
              name="description"
              defaultValue={hostel?.description ?? ""}
              placeholder="Short description for students"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add hostel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
