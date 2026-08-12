const fs = require("fs");

const envPath = ".env.local";
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
}

const base =
  process.env.AI_BUILDER_BASE_URL ??
  "https://space.ai-builders.com/backend/v1";
const token = process.env.AI_BUILDER_TOKEN;

console.log("token_set", Boolean(token && token !== "your_token_here"));
console.log("base", base);

fetch(`${base}/chat/completions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: process.env.AI_MODEL ?? "deepseek",
    messages: [{ role: "user", content: "hi" }],
  }),
})
  .then(async (response) => {
    console.log("status", response.status);
    console.log("body", (await response.text()).slice(0, 500));
  })
  .catch((error) => {
    console.error("fetch_error", error.message);
  });
