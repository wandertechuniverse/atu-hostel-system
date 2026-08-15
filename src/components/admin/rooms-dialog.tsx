"use client";

import { useActionState, useEffect, useState } from "react";
import { CsrfInput } from "@/components/csrf-input";
import { toast } from "sonner";
import { Check, Pencil, Plus, X } from "lucide-react";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { FormSelect } from "@/components/admin/form-select";
import { RoomImageField } from "@/components/admin/room-image-field";
import {
  deleteRoomAction,
  roomFormAction,
  type HostelFormState,
} from "@/lib/actions/hostel";

const initial: HostelFormState = {};

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

type RoomRow = {
  id: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  pricePerSemester: number;
  status: "AVAILABLE" | "MAINTENANCE" | "CLOSED";
  description: string | null;
  featuredImage: string | null;
};

export function RoomsDialog({
  hostelId,
  hostelName,
  rooms,
}: {
  hostelId: string;
  hostelName: string;
  rooms: RoomRow[];
}) {
  const [open, setOpen] = useState(false);
  const [roomType, setRoomType] = useState("2-in-1");
  const [status, setStatus] = useState("AVAILABLE");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addState, addAction, addPending] = useActionState(roomFormAction, initial);
  const [editState, editAction, editPending] = useActionState(
    roomFormAction,
    initial,
  );
  const [delState, delAction, delPending] = useActionState(
    deleteRoomAction,
    initial,
  );

  useEffect(() => {
    if (addState.ok) toast.success("Room added");
    else if (addState.error) toast.error(addState.error);
  }, [addState]);
  useEffect(() => {
    if (editState.ok) {
      toast.success("Room updated");
      setEditingId(null);
    } else if (editState.error) {
      toast.error(editState.error);
    }
  }, [editState]);
  useEffect(() => {
    if (delState.ok) toast.success("Room removed");
    else if (delState.error) toast.error(delState.error);
  }, [delState]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Rooms
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rooms - {hostelName}</DialogTitle>
          <DialogDescription>
            {rooms.length} room{rooms.length === 1 ? "" : "s"} · prices are per
            academic year in GH₵
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-auto pr-1">
          {rooms.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No rooms yet - add the first one below.
            </p>
          )}
          {rooms.map((room) => (
            <div
              key={room.id}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium">{room.roomNumber}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {room.roomType} · {room.capacity} bed
                    {room.capacity === 1 ? "" : "s"}
                  </span>
                  <div className="font-medium text-foreground">
                    GH₵ {room.pricePerSemester.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      / year
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <StatusBadge status={room.status} />
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      setEditingId(editingId === room.id ? null : room.id)
                    }
                  >
                    <Pencil />
                    {editingId === room.id ? "Cancel" : "Edit"}
                  </Button>
                  <form action={delAction}>
      <CsrfInput />
                    <input type="hidden" name="roomId" value={room.id} />
                    <Button
                      type="submit"
                      size="xs"
                      variant="outline"
                      disabled={delPending}
                    >
                      Remove
                    </Button>
                  </form>
                </div>
              </div>

              <div className="mt-2">
                <RoomImageField
                  roomId={room.id}
                  roomNumber={room.roomNumber}
                  currentImage={room.featuredImage}
                />
              </div>

              {editingId === room.id && (
                <form
                  action={editAction}
                  className="mt-2 grid grid-cols-1 gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2"
                >
      <CsrfInput />
                  <input type="hidden" name="hostelId" value={hostelId} />
                  <input type="hidden" name="roomId" value={room.id} />
                  {editState.error && (
                    <p
                      className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      role="alert"
                    >
                      {editState.error}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-number-${room.id}`}>Room number</Label>
                    <Input
                      id={`edit-number-${room.id}`}
                      name="roomNumber"
                      defaultValue={room.roomNumber}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-type-${room.id}`}>Room type</Label>
                    <select
                      id={`edit-type-${room.id}`}
                      name="roomType"
                      defaultValue={room.roomType}
                      className={selectClass}
                    >
                      <option value="2-in-1">2-in-1 (shared)</option>
                      <option value="4-in-1">4-in-1 (shared)</option>
                      <option value="Single">Single room</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-capacity-${room.id}`}>
                      Capacity (beds)
                    </Label>
                    <Input
                      id={`edit-capacity-${room.id}`}
                      name="capacity"
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={room.capacity}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-price-${room.id}`}>
                      Price / year (GH₵)
                    </Label>
                    <Input
                      id={`edit-price-${room.id}`}
                      name="pricePerSemester"
                      type="number"
                      min={0}
                      step={50}
                      defaultValue={room.pricePerSemester}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-status-${room.id}`}>Status</Label>
                    <select
                      id={`edit-status-${room.id}`}
                      name="status"
                      defaultValue={room.status}
                      className={selectClass}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <div className="flex items-end justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      <X />
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={editPending}>
                      <Check />
                      {editPending ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
        {delState.error && (
          <p className="text-xs text-destructive" role="alert">
            {delState.error}
          </p>
        )}

        <form action={addAction} className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <CsrfInput />
          <input type="hidden" name="hostelId" value={hostelId} />
          {addState.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {addState.error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`room-number-${hostelId}`}>Room number</Label>
              <Input
                id={`room-number-${hostelId}`}
                name="roomNumber"
                placeholder="e.g. 105"
                required
              />
            </div>
            <FormSelect
              id={`room-type-${hostelId}`}
              label="Room type"
              name="roomType"
              value={roomType}
              onChange={setRoomType}
              options={[
                { value: "2-in-1", label: "2-in-1 (shared)" },
                { value: "4-in-1", label: "4-in-1 (shared)" },
                { value: "Single", label: "Single room" },
              ]}
            />
            <div className="space-y-1.5">
              <Label htmlFor={`room-capacity-${hostelId}`}>Capacity (beds)</Label>
              <Input
                id={`room-capacity-${hostelId}`}
                name="capacity"
                type="number"
                min={1}
                max={20}
                defaultValue={2}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`room-price-${hostelId}`}>Price / year (GH₵)</Label>
              <Input
                id={`room-price-${hostelId}`}
                name="pricePerSemester"
                type="number"
                min={0}
                step={50}
                placeholder="e.g. 1200"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <FormSelect
                id={`room-status-${hostelId}`}
                label="Status"
                name="status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "AVAILABLE", label: "Available" },
                  { value: "MAINTENANCE", label: "Maintenance" },
                  { value: "CLOSED", label: "Closed" },
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addPending}>
              <Plus />
              {addPending ? "Adding…" : "Add room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
