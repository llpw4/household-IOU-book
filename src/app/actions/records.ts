"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/service";
import {
  createRecord,
  deleteRecord,
  deleteRecords,
  previewRecord,
  updateRecord,
} from "@/lib/ledger/service";
import type { PreviewResult, RecordInput } from "@/lib/ledger/types";
import { saveAttachment } from "@/lib/storage/local";

export async function previewRecordAction(
  input: RecordInput,
  excludeRecordId?: string,
): Promise<PreviewResult> {
  const user = await requireUser();
  return previewRecord(user.id, input, excludeRecordId);
}

export async function submitRecordAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const payload = formData.get("payload");
  if (typeof payload !== "string") {
    throw new Error("缺少表单数据");
  }

  const input = JSON.parse(payload) as RecordInput;
  input.transactionDate = new Date(input.transactionDate);

  const recordId = formData.get("recordId");
  const attachment = formData.get("attachment");

  let savedRecordId: string;

  if (typeof recordId === "string" && recordId) {
    const updated = await updateRecord(user.id, recordId, input);
    savedRecordId = updated.id;
  } else {
    const created = await createRecord(user.id, input);
    savedRecordId = created.id;
  }

  if (attachment instanceof File && attachment.size > 0) {
    const buffer = Buffer.from(await attachment.arrayBuffer());
    const localPath = await saveAttachment(
      savedRecordId,
      attachment.name,
      buffer,
    );

    await prisma.attachment.create({
      data: {
        recordId: savedRecordId,
        localPath,
        filename: attachment.name,
      },
    });
  }
}

export async function removeRecordAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteRecord(user.id, id);
  revalidatePath("/records");
}

export async function removeRecordsAction(ids: string[]): Promise<number> {
  const user = await requireUser();
  const count = await deleteRecords(user.id, ids);
  if (count === 0) {
    throw new Error("请选择要删除的流水");
  }

  revalidatePath("/records");
  return count;
}
