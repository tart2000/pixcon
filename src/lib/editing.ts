/** Drawing and managing icons is only allowed on a local dev server (`next dev`) for now. */
export const canEdit = process.env.NODE_ENV === "development";

export function assertCanEdit() {
  if (!canEdit) throw new Error("Editing is disabled");
}
