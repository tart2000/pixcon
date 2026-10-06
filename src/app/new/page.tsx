import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listAlts } from "@/lib/db";
import { Editor } from "@/components/Editor";
import { canEdit } from "@/lib/editing";

export const metadata = { title: "New icon · Pixcon" };

export default async function NewIconPage() {
  if (!canEdit) notFound();
  await connection();
  return <Editor knownAlts={await listAlts()} />;
}
