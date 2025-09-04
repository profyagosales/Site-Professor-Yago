import { createRoot } from "react-dom/client";
import Viewer from "./Viewer";

function main() {
  const root = createRoot(document.getElementById("root")!);
  root.render(<Viewer />);

  window.addEventListener("message", async (ev) => {
    const { type, payload } = ev.data || {};
    if (type !== "open") return;

    // payload: { url: string, token?: string }
    const headers: Record<string, string> = {};
    if (payload?.token) headers["Authorization"] = `Bearer ${payload.token}`;

    // passa objeto fonte para react-pdf/pdfjs
    window.dispatchEvent(new CustomEvent("pdf:open", { detail: { url: payload.url, headers } }));
  });
}
main();
