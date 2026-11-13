import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

const majorVersion = Number(process.versions.node.split(".")[0]);
if (majorVersion < 22) {
  console.error(
    `\nNode.js ${process.versions.node} is active, but this website requires Node.js 22.`,
  );
  console.error(
    "Activate the Node.js 22 application environment first, then run this command again.",
  );
  console.error("CloudLinux example:");
  console.error("  source ~/nodevenv/hygiene-links-app/22/bin/activate");
  console.error("cPanel Application Manager example:");
  console.error("  export PATH=/opt/cpanel/ea-nodejs22/bin:$PATH");
  process.exit(1);
}

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

terminal.question("Enter the new CMS password: ", (password) => {
  terminal.close();
  if (password.length < 12) {
    console.error("Use a password containing at least 12 characters.");
    process.exitCode = 1;
    return;
  }

  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  console.log("\nCopy this complete value into CMS_ADMIN_PASSWORD_HASH:\n");
  console.log(`scrypt:${salt}:${hash}`);
});
