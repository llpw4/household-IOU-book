import type { PartyType } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export interface PartyItem {
  id: string;
  name: string;
  partyType: PartyType;
  note: string | null;
  recordCount: number;
  createdAt: Date;
}

export interface PartyInput {
  name: string;
  partyType: PartyType;
  note?: string;
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("相关方名称不能为空");
  }
  return trimmed;
}

function mapParty(
  party: {
    id: string;
    name: string;
    partyType: PartyType;
    note: string | null;
    createdAt: Date;
    _count: { records: number };
  },
): PartyItem {
  return {
    id: party.id,
    name: party.name,
    partyType: party.partyType,
    note: party.note,
    recordCount: party._count.records,
    createdAt: party.createdAt,
  };
}

export async function listParties(userId: string): Promise<PartyItem[]> {
  const parties = await prisma.party.findMany({
    where: { userId },
    include: { _count: { select: { records: true } } },
    orderBy: { name: "asc" },
  });

  return parties.map(mapParty);
}

export async function listPartyOptions(userId: string): Promise<
  Pick<PartyItem, "id" | "name" | "partyType">[]
> {
  return prisma.party.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, partyType: true },
  });
}

export async function getPartyById(
  userId: string,
  id: string,
): Promise<PartyItem | null> {
  const party = await prisma.party.findFirst({
    where: { id, userId },
    include: { _count: { select: { records: true } } },
  });

  return party ? mapParty(party) : null;
}

export async function createParty(
  userId: string,
  input: PartyInput,
): Promise<PartyItem> {
  const name = normalizeName(input.name);

  const party = await prisma.party.create({
    data: {
      userId,
      name,
      partyType: input.partyType,
      note: input.note?.trim() || null,
    },
    include: { _count: { select: { records: true } } },
  });

  return mapParty(party);
}

export async function updateParty(
  userId: string,
  id: string,
  input: PartyInput,
): Promise<PartyItem> {
  const name = normalizeName(input.name);

  const existing = await prisma.party.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new Error("相关方不存在");
  }

  const party = await prisma.party.update({
    where: { id },
    data: {
      name,
      partyType: input.partyType,
      note: input.note?.trim() || null,
    },
    include: { _count: { select: { records: true } } },
  });

  return mapParty(party);
}

export async function deleteParty(userId: string, id: string): Promise<void> {
  const party = await prisma.party.findFirst({
    where: { id, userId },
    include: { _count: { select: { records: true } } },
  });

  if (!party) {
    throw new Error("相关方不存在");
  }

  if (party._count.records > 0) {
    throw new Error("该相关方仍有关联流水，无法删除");
  }

  await prisma.party.delete({ where: { id } });
}

export async function findPartyByName(userId: string, name: string) {
  const trimmed = normalizeName(name);
  const party = await prisma.party.findFirst({
    where: { userId, name: trimmed },
  });

  if (!party) {
    throw new Error(`相关方「${trimmed}」不存在，请先在相关方管理中添加`);
  }

  return party;
}

export async function findOrCreatePartyForImport(userId: string, name: string) {
  const trimmed = normalizeName(name);

  return prisma.party.upsert({
    where: {
      userId_name: { userId, name: trimmed },
    },
    update: {},
    create: { userId, name: trimmed, partyType: "RELATIVE" },
  });
}

export function parsePartyType(value: string): PartyType | null {
  if (value === "RELATIVE" || value === "亲戚") return "RELATIVE";
  if (value === "FRIEND" || value === "朋友") return "FRIEND";
  if (value === "ORGANIZATION" || value === "机构/公司") return "ORGANIZATION";
  return null;
}
