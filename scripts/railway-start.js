// รันก่อน start server: migrate + seed (idempotent) แล้วค่อย next start
import { spawnSync } from "node:child_process";

function run(cmd, args, env = {}) {
    const p = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
    if (p.status !== 0) {
        console.error(`❌ Command failed: ${cmd} ${args.join(" ")}`);
        process.exit(p.status ?? 1);
    }
}

console.log("🚀 Preparing database (migrate deploy)...");
run("npm", ["run", "db:migrate"]);

if (process.env.SEED_ON_START === "true") {
    console.log("🌱 Seeding database (once)...");
    // ทำให้ไม่ล้ม deploy ถ้า seed ซ้ำ
    try {
        run("npm", ["run", "db:seed"]);
    } catch (e) {
        console.warn("⚠️ Seed failed or already applied. Continuing...");
    }
} else {
    console.log("⏭️  Skipping seed (set SEED_ON_START=true to enable).");
}

console.log("✅ DB ready. Starting Next.js...");
run("npm", ["run", "start:next"]);
