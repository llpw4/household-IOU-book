import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { checkUsernameAvailability, createUserAccount } from "./service";

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.attachment.deleteMany();
  await prisma.record.deleteMany();
  await prisma.party.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("checkUsernameAvailability", () => {
  it("returns available for a valid unused username", async () => {
    const result = await checkUsernameAvailability("new_user");
    expect(result).toEqual({ available: true });
  });

  it("returns unavailable when username already exists", async () => {
    await createUserAccount("taken_user", "test-20260811");

    const result = await checkUsernameAvailability("taken_user");
    expect(result.available).toBe(false);
    expect(result.error).toBe("用户名已被占用");
  });

  it("returns format error for invalid username", async () => {
    const result = await checkUsernameAvailability("a");
    expect(result.available).toBe(false);
    expect(result.error).toContain("2-32");
  });
});
