import { execSync } from "child_process";

const PORT = process.env.PORT ?? "3000";

function collectListeningPids(port: string): number[] {
  if (process.platform === "win32") {
    try {
      const output = execSync(`netstat -ano | findstr ":${port}"`, {
        encoding: "utf8",
      });
      const pids = new Set<number>();

      for (const line of output.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts.at(-1));
        if (Number.isInteger(pid) && pid > 0) {
          pids.add(pid);
        }
      }

      return [...pids];
    } catch {
      return [];
    }
  }

  try {
    const output = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
      encoding: "utf8",
    });
    return output
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function stopProcess(pid: number) {
  if (process.platform === "win32") {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    return;
  }

  process.kill(pid, "SIGTERM");
}

function main() {
  const pids = collectListeningPids(PORT);

  if (pids.length === 0) {
    console.log(`端口 ${PORT} 上没有运行中的服务。`);
    return;
  }

  for (const pid of pids) {
    stopProcess(pid);
    console.log(`已停止进程 ${pid}（端口 ${PORT}）`);
  }
}

main();
