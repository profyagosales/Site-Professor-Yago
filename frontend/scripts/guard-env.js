// Simple environment guard for builds
const hasUrl = !!process.env.VITE_API_URL;

if (hasUrl) {
  console.log(`VITE_API_URL set to ${process.env.VITE_API_URL}`);
} else {
  const msg = "VITE_API_URL ausente. Continuando com fallback '/api'.";
  if (process.env.VERCEL === "1" || process.env.CI === "true") {
    console.warn(msg);
    process.exit(0);
  } else {
    console.warn(msg);
    process.exit(0);
  }
}
