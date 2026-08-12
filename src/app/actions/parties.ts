"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/service";
import {
  createParty,
  deleteParty,
  parsePartyType,
  updateParty,
} from "@/lib/party/service";

function readPartyInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const partyType = parsePartyType(String(formData.get("partyType") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (!partyType) {
    throw new Error("请选择相关方类型");
  }

  return { name, partyType, note: note || undefined };
}

export async function createPartyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const input = readPartyInput(formData);
  await createParty(user.id, input);

  revalidatePath("/parties");
  revalidatePath("/records/new");
  revalidatePath("/records");

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (returnTo.startsWith("/")) {
    redirect(returnTo);
  }
}

export async function updatePartyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("缺少相关方 ID");
  }

  const input = readPartyInput(formData);
  await updateParty(user.id, id, input);

  revalidatePath("/parties");
  revalidatePath("/records/new");
  revalidatePath("/records");
}

export async function deletePartyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("缺少相关方 ID");
  }

  await deleteParty(user.id, id);

  revalidatePath("/parties");
  revalidatePath("/records/new");
  revalidatePath("/records");
}
