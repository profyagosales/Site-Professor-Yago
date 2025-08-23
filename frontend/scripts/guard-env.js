// Simple environment guard for builds
const apiUrl = process.env.VITE_API_URL;
if (apiUrl) {
  console.log(`VITE_API_URL set to ${apiUrl}`);
} else {
  console.log("VITE_API_URL not set; falling back to '/api'");
}
