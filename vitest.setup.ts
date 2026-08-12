import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const testDbPath = path.join(process.cwd(), "prisma", "prisma", "test.db");
const testDbJournal = path.join(process.cwd(), "prisma", "prisma", "test.db-journal");

for (const filePath of [testDbPath, testDbJournal]) {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

execSync("npx prisma migrate deploy", {
  stdio: "ignore",
  env: {
    ...process.env,
    DATABASE_URL: "file:./prisma/test.db",
  },
});
