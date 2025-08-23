import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") return res.status(200).json([]);
  return res.status(405).end();
}
