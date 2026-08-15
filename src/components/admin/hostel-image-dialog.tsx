"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
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
import {
  removeHostelImageAction,
  uploadHostelImageAction,
  type HostelFormState,
  type UploadImageState,
} from "@/lib/actions/hostel";

const initial: UploadImageState = {};
const initialRemove: HostelFormState = {};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export function HostelImageDialog({
  hostelId,
  hostelName,
  currentImage,
}: {
  hostelId: string;
  hostelName: string;
  currentImage: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    uploadHostelImageAction,
    initial,
  );
  const [removeState, removeFormAction, removePending] = useActionState(
    removeHostelImageAction,
    initialRemove,
  );

  // Preview the selected file locally before submitting.
  function onPick(file: File | undefined | null) {
    setClientError(null);
    if (!file) {
      setPreview(null);
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      setClientError("Use a JPEG, PNG or WebP image.");
      setPreview(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setClientError("Image must be 10 MB or smaller.");
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    if (state.ok) {
      toast.success("Photo updated", {
        description: `${hostelName}'s photo now shows your image.`,
      });
      setOpen(false);
      setPreview(null);
    } else if (state.error) {
      toast.error(state.error);
    }
    if (removeState.ok) {
      toast.success("Photo removed", {
        description: `${hostelName} will show without a photo until you add one.`,
      });
      setOpen(false);
    } else if (removeState.error) {
      toast.error(removeState.error);
    }
  }, [state, removeState, hostelName]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <ImagePlus className="size-3.5" />
        Photo
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hostel photo</DialogTitle>
          <DialogDescription>
            Upload a real photo of {hostelName}. It replaces the current image
            on the student listing, the detail page and the map.
          </DialogDescription>
        </DialogHeader>

        {currentImage && !preview && (
          <div className="relative aspect-[16/8] overflow-hidden rounded-lg border bg-muted">
            <Image
              src={currentImage}
              alt={`Current photo of ${hostelName}`}
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
            />
          </div>
        )}
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="New photo preview"
            className="aspect-[16/8] w-full rounded-lg border object-cover"
          />
        )}

        {currentImage && !preview && (
          <form action={removeFormAction} className="pb-1">
      <CsrfInput />
            <input type="hidden" name="hostelId" value={hostelId} />
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={removePending || pending}
            >
              <Trash2 className="size-3.5" />
              {removePending ? "Removing…" : "Remove photo"}
            </Button>
          </form>
        )}
        <form action={formAction} className="space-y-3">
      <CsrfInput />
          <input type="hidden" name="hostelId" value={hostelId} />
          {(state.error || clientError) && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error ?? clientError}
            </p>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">
            <ImagePlus className="size-4" />
            Choose an image (JPEG, PNG or WebP, max 10 MB)
            <input
              type="file"
              name="file"
              accept={ACCEPTED.join(",")}
              className="sr-only"
              onChange={(event) => onPick(event.target.files?.[0])}
            />
          </label>
          <DialogFooter>
            <Button type="submit" disabled={pending || !preview}>
              {pending ? "Uploading…" : "Upload photo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
