"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  removeRoomImageAction,
  uploadRoomImageAction,
  type HostelFormState,
  type UploadImageState,
} from "@/lib/actions/hostel";

const initial: UploadImageState = {};
const initialRemove: HostelFormState = {};
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export function RoomImageField({
  roomId,
  roomNumber,
  currentImage,
}: {
  roomId: string;
  roomNumber: string;
  currentImage: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    uploadRoomImageAction,
    initial,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeRoomImageAction,
    initialRemove,
  );

  useEffect(() => {
    if (state.ok) {
      setPreview(null);
      toast.success("Room photo updated");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);
  useEffect(() => {
    if (removeState.ok) toast.success("Room photo removed");
    else if (removeState.error) toast.error(removeState.error);
  }, [removeState]);

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

  const shown = preview ?? currentImage;

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <p className="text-xs font-medium text-muted-foreground">
        Photo · room {roomNumber}
      </p>
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shown}
          alt={`Room ${roomNumber}`}
          className="h-28 w-full rounded-md object-cover"
        />
      )}
      {(state.error || removeState.error || clientError) && (
        <p className="text-xs text-destructive" role="alert">
          {state.error ?? removeState.error ?? clientError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <CsrfInput />
          <input type="hidden" name="roomId" value={roomId} />
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted">
            <ImagePlus className="size-3.5" />
            {shown ? "Replace" : "Add photo"}
            <input
              type="file"
              name="file"
              accept={ACCEPTED.join(",")}
              className="sr-only"
              onChange={(event) => onPick(event.target.files?.[0])}
            />
          </label>
          <Button
            type="submit"
            size="xs"
            disabled={pending || !preview}
          >
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>
        {currentImage && (
          <form action={removeAction}>
            <CsrfInput />
            <input type="hidden" name="roomId" value={roomId} />
            <Button
              type="submit"
              size="xs"
              variant="outline"
              disabled={removePending}
            >
              <Trash2 className="size-3.5" />
              {removePending ? "Removing…" : "Remove"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
