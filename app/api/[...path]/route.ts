/**
 * app/api/[...path]/route.ts
 *
 * Catch-all reverse proxy — ส่งทุก request ที่มาที่ /api/* ต่อไปยัง backend
 *
 * ตัวอย่าง:
 *   GET  /api/product/find-all  →  http://localhost:4000/api/product/find-all
 *   POST /api/auth/login        →  http://localhost:4000/api/auth/login
 *
 * Token ถูกแนบอัตโนมัติโดย proxyRequest() (จาก cookie หรือ Authorization header)
 */
import { NextRequest } from "next/server";
import { proxyRequest } from "../../../lib/proxy";
function buildPath(params: { path: string[] }): string {
  return "/api/" + params.path.join("/");
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return proxyRequest(request, buildPath(p));
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return proxyRequest(request, buildPath(p));
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return proxyRequest(request, buildPath(p));
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return proxyRequest(request, buildPath(p));
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const p = await params;
  return proxyRequest(request, buildPath(p));
}