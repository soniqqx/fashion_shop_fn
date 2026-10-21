/**
 * proxy.ts — Generic server-side reverse proxy helper
 *
 * ใช้ใน Next.js API Route (App Router) ฝั่ง server เท่านั้น
 *
 * วิธีส่ง token:
 *  1. ถ้า request เข้ามาพร้อม Authorization header → ส่งต่อไปเลย
 *  2. ถ้าไม่มี → อ่าน token จาก cookie ชื่อ "token" แล้วแนบเป็น Bearer
 */
import { NextRequest, NextResponse } from "next/server";
const BACKEND_BASE = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
/**
 * โยน request ไปยัง backend แล้วส่งผล response กลับ
 *
 * @param request   NextRequest จาก Route Handler
 * @param backendPath   path ที่จะเรียก เช่น "/api/product/find-all"
 */
export async function proxyRequest(
  request: NextRequest,
  backendPath: string
): Promise<NextResponse> {
  // ---- 1. สร้าง target URL ----
  const targetUrl = new URL(backendPath, BACKEND_BASE);
  // ส่ง query string ตามมาด้วย
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });
  // ---- 2. สร้าง headers ----
  const forwardHeaders: HeadersInit = {
    "Content-Type": request.headers.get("content-type") ?? "application/json",
    Accept: request.headers.get("accept") ?? "application/json",
  };
  // ส่ง Authorization: ถ้า client แนบมา → ใช้ตัวนั้น
  //                    ถ้าไม่มี → ดึงจาก cookie แล้วแนบให้อัตโนมัติ
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    forwardHeaders["Authorization"] = authHeader;
  } else {
    const cookieToken = request.cookies.get("token")?.value;
    if (cookieToken) {
      forwardHeaders["Authorization"] = `Bearer ${cookieToken}`;
    }
  }
  // ---- 3. ส่ง request ----
  try {
    const backendRes = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      // ส่ง body สำหรับ POST/PUT/PATCH (ไม่ส่งสำหรับ GET/HEAD)
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      // ต้องใช้ duplex เพื่อ stream body ใน Node 18+
      // @ts-expect-error — duplex ยังไม่มีใน TypeScript types แต่ Node.js ต้องการ
      duplex: "half",
    });
    // ---- 4. แปลง response ----
    const contentType = backendRes.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const responseBody = isJson ? await backendRes.json() : await backendRes.text();
    // ---- 5. จัดการ 401 — แจ้ง client ให้ redirect ไป /login ----
    if (backendRes.status === 401) {
      return NextResponse.json(
        { message: "session หมดอายุ กรุณาเข้าสู่ระบบใหม่", redirect: "/login" },
        { status: 401 }
      );
    }
    return NextResponse.json(responseBody, { status: backendRes.status });
  } catch (err) {
    console.error("[proxy] ไม่สามารถเชื่อมต่อ backend:", err);
    return NextResponse.json(
      { message: "ไม่สามารถเชื่อมต่อ backend ได้", detail: String(err) },
      { status: 502 }
    );
  }
}