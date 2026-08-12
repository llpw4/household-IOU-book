"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import type { PartyType } from "@prisma/client";
import {
  createPartyAction,
  deletePartyAction,
  updatePartyAction,
} from "@/app/actions/parties";
import type { PartyItem } from "@/lib/party/service";
import { partyTypeLabels, partyTypeOptions } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormMode = "create" | "edit";

type SuccessNotice = {
  message: string;
  hint?: string;
};

function PartySuccessOverlay({ notice }: { notice: SuccessNotice }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/25 px-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white px-8 py-7 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-700">
          ✓
        </div>
        <p className="mt-4 text-lg font-semibold text-stone-900">{notice.message}</p>
        {notice.hint ? (
          <p className="mt-2 text-sm text-stone-500">{notice.hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  party,
  isPending,
  onCancel,
  onConfirm,
}: {
  party: PartyItem;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPending, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-stone-900/40 px-4"
      onClick={() => {
        if (!isPending) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-party-title"
        aria-describedby="delete-party-desc"
        className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          删除确认
        </p>
        <h2 id="delete-party-title" className="mt-1 text-lg font-bold text-stone-900">
          确定删除这个相关方吗？
        </h2>
        <p id="delete-party-desc" className="mt-3 text-sm leading-6 text-stone-600">
          将删除相关方「
          <span className="font-medium text-stone-900">{party.name}</span>
          」。此操作不可恢复。
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            取消
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? "删除中..." : "确认删除"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PartyModal({
  open,
  mode,
  partyName,
  onClose,
  children,
  closeOnBackdrop = true,
}: {
  open: boolean;
  mode: FormMode;
  partyName?: string;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdrop?: boolean;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="party-modal-title"
        className={cn(
          "w-full max-w-lg rounded-2xl border-2 bg-white p-6 shadow-xl",
          isEdit ? "border-amber-300" : "border-emerald-300",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                isEdit ? "text-amber-700" : "text-emerald-700",
              )}
            >
              {isEdit ? "编辑模式" : "新增模式"}
            </p>
            <h2
              id="party-modal-title"
              className="mt-1 text-lg font-bold text-stone-900"
            >
              {isEdit ? `编辑：${partyName}` : "添加相关方"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function PartyForm({
  mode,
  formKey,
  initial,
  returnTo,
  onCancel,
  onSuccess,
}: {
  mode: FormMode;
  formKey: number;
  initial?: PartyItem;
  returnTo?: string;
  onCancel: () => void;
  onSuccess: (partyName: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = mode === "edit";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const name = String(formData.get("name") ?? "").trim();

        if (isEdit && initial) {
          formData.set("id", initial.id);
          await updatePartyAction(formData);
          onSuccess(name);
          return;
        }

        if (returnTo) {
          formData.set("returnTo", returnTo);
        }
        await createPartyAction(formData);
        if (!returnTo) {
          onSuccess(name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "操作失败");
      }
    });
  }

  return (
    <form key={formKey} action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor={`name-${formKey}`}>相关方名称</Label>
        <Input
          id={`name-${formKey}`}
          name="name"
          defaultValue={initial?.name ?? ""}
          placeholder="如：张三、某银行"
          required
        />
      </div>

      <div>
        <Label htmlFor={`partyType-${formKey}`}>相关方类型</Label>
        <Select
          id={`partyType-${formKey}`}
          name="partyType"
          defaultValue={initial?.partyType ?? "RELATIVE"}
          required
        >
          {partyTypeOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor={`note-${formKey}`}>备注（可选）</Label>
        <Textarea
          id={`note-${formKey}`}
          name="note"
          rows={2}
          defaultValue={initial?.note ?? ""}
          placeholder="如：表姐、同事、房贷银行"
        />
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isEdit ? "保存修改" : "添加"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  );
}

export function PartyManagementPanel({
  parties,
  returnTo,
}: {
  parties: PartyItem[];
  returnTo?: string;
}) {
  const router = useRouter();
  const [modalMode, setModalMode] = useState<FormMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addFormKey, setAddFormKey] = useState(0);
  const [editFormKey, setEditFormKey] = useState(0);
  const [successNotice, setSuccessNotice] = useState<SuccessNotice | null>(null);
  const [deletingParty, setDeletingParty] = useState<PartyItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const editingParty = parties.find((party) => party.id === editingId);

  useEffect(() => {
    if (returnTo) {
      setModalMode("create");
    }
  }, [returnTo]);

  useEffect(() => {
    if (!successNotice) return;
    const timer = window.setTimeout(() => setSuccessNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [successNotice]);

  function openCreateModal() {
    setEditingId(null);
    setModalMode("create");
  }

  function openEditModal(party: PartyItem) {
    setEditingId(party.id);
    setEditFormKey((key) => key + 1);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
  }

  function handleCreateSuccess(name: string) {
    closeModal();
    setAddFormKey((key) => key + 1);
    setSuccessNotice({
      message: `已添加「${name}」`,
      hint: returnTo ? "即将返回继续记账" : "可继续添加或管理相关方",
    });
    router.refresh();
  }

  function handleEditSuccess(name: string) {
    closeModal();
    setSuccessNotice({
      message: `已更新「${name}」`,
      hint: "修改已保存",
    });
    router.refresh();
  }

  function confirmDelete() {
    if (!deletingParty) return;

    setDeleteError(null);
    startDelete(async () => {
      try {
        const formData = new FormData();
        formData.set("id", deletingParty.id);
        await deletePartyAction(formData);
        if (editingId === deletingParty.id) {
          closeModal();
        }
        const deletedName = deletingParty.name;
        setDeletingParty(null);
        setSuccessNotice({
          message: `已删除「${deletedName}」`,
          hint: "相关方已从列表移除",
        });
        router.refresh();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "删除失败");
      }
    });
  }

  return (
    <div className="space-y-6">
      {successNotice ? <PartySuccessOverlay notice={successNotice} /> : null}

      {deletingParty ? (
        <DeleteConfirmModal
          party={deletingParty}
          isPending={isDeleting}
          onCancel={() => setDeletingParty(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      <PartyModal
        open={modalMode === "create"}
        mode="create"
        onClose={closeModal}
      >
        <PartyForm
          mode="create"
          formKey={addFormKey}
          returnTo={returnTo}
          onCancel={closeModal}
          onSuccess={handleCreateSuccess}
        />
      </PartyModal>

      <PartyModal
        open={modalMode === "edit" && Boolean(editingParty)}
        mode="edit"
        partyName={editingParty?.name}
        onClose={closeModal}
      >
        {editingParty ? (
          <PartyForm
            mode="edit"
            formKey={editFormKey}
            initial={editingParty}
            onCancel={closeModal}
            onSuccess={handleEditSuccess}
          />
        ) : null}
      </PartyModal>

      {returnTo ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          请添加相关方，保存后将返回继续记账。
          <Link href={returnTo} className="ml-2 font-medium underline">
            返回记账
          </Link>
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>相关方列表</CardTitle>
            <p className="mt-2 text-sm text-stone-500">
              共 {parties.length} 个相关方。已有流水的相关方不可删除。
            </p>
          </div>
          <Button type="button" onClick={openCreateModal}>
            + 添加相关方
          </Button>
        </div>

        {deleteError ? (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-stone-500">
              <tr>
                <th className="px-4 py-3">名称</th>
                <th className="px-4 py-3">类型</th>
                <th className="px-4 py-3">流水数</th>
                <th className="px-4 py-3">备注</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {parties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                    暂无相关方，请点击「添加相关方」
                  </td>
                </tr>
              ) : (
                parties.map((party) => {
                  const isEditingRow = editingId === party.id && modalMode === "edit";

                  return (
                    <tr
                      key={party.id}
                      className={cn(
                        "border-t border-stone-100 transition-colors",
                        isEditingRow && "bg-amber-50 ring-1 ring-inset ring-amber-200",
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-stone-900">
                        <Link
                          href={`/parties/${encodeURIComponent(party.name)}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {party.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {partyTypeLabels[party.partyType as PartyType]}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{party.recordCount}</td>
                      <td className="px-4 py-3 text-stone-600">{party.note || "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className={cn(
                              "hover:underline",
                              isEditingRow
                                ? "font-semibold text-amber-800"
                                : "text-emerald-700",
                            )}
                            onClick={() => openEditModal(party)}
                          >
                            {isEditingRow ? "编辑中" : "编辑"}
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-stone-400"
                            disabled={party.recordCount > 0 || isDeleting}
                            onClick={() => setDeletingParty(party)}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
