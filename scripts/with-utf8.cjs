const { spawnSync } = require("node:child_process");

if (process.platform === "win32") {
  spawnSync("cmd", ["/c", "chcp 65001 >nul"], { stdio: "ignore" });
}

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("usage: node scripts/with-utf8.cjs <command> [args...]");
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
