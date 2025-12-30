import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Build baileys
try {
  execSync("npm run build", {
    cwd: path.join("node_modules", "baileys"),
    stdio: "ignore",
  });
} catch {
  /* */
}

// Patch libsignal
try {
  const target = path.join(
    "node_modules",
    "libsignal",
    "src",
    "session_record.js",
  );
  const content = fs.readFileSync(target, "utf8");
  fs.writeFileSync(
    target,
    content
      .split("\n")
      .filter(
        (line) => !line.includes('console.info("Closing session:", session)'),
      )
      .join("\n"),
    "utf8",
  );
} catch {
  /** */
}

// Build astro-web-runtime frontend
try {
  const astroPath = path.join(process.cwd(), "astro-web-runtime");
  if (fs.existsSync(astroPath)) {
    console.log("Installing astro-web-runtime dependencies...");
    execSync("bun install", {
      cwd: astroPath,
      stdio: "inherit",
    });
    console.log("Building astro-web-runtime...");
    execSync("bun run build", {
      cwd: astroPath,
      stdio: "inherit",
    });
    console.log("astro-web-runtime build complete.");
  }
} catch (error) {
  console.error("Failed to build astro-web-runtime:", error);
}
