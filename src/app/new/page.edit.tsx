import { connection } from "next/server";
import { listAlts } from "@/lib/db";
import { Editor } from "@/components/Editor";

export const metadata = { title: "New icon" };

export default async function NewIconPage() {
  await connection();
  return <Editor knownAlts={await listAlts()} />;
}
