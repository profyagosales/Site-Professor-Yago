import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const url = process.env.VITE_API_URL;
if (!url) {
  console.error("VITE_API_URL ausente.");
  process.exit(1);
}

const u = new URL(url + "/health");
const lib = u.protocol === "https:" ? https : http;

const req = lib.request(u, (res) => {
  if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
    console.log("API OK:", u.href, res.statusCode);
    process.exit(0);
  } else {
    console.error("API NOK:", u.href, res.statusCode);
    process.exit(2);
  }
});
req.on("error", (e) => {
  console.error("API ERR:", e.message);
  process.exit(3);
});
req.end();
