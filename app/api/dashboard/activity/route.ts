import { NextRequest, NextResponse } from "next/server";
import { getActivityEntityUrl } from "@/lib/service-launch";
import { getAllServices } from "@/lib/services";

export const dynamic = "force-dynamic";

type ActivityItem = {
  id: string;
  source: "catering" | "cost-mgmt" | "coupons";
  appName: string;
  action: string;
  title: string;
  details: string;
  timestamp: string;
  href: string;
};

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
}

function toIsoValue(value: string): number {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function buildProxyHeaders(request: NextRequest): HeadersInit | undefined {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = request.cookies.get("sso_token")?.value;
  const headers: Record<string, string> = {};

  if (cookieHeader) headers.cookie = cookieHeader;
  if (token) headers.Authorization = `Bearer ${token}`;

  return Object.keys(headers).length > 0 ? headers : undefined;
}

async function safeJsonResponse(response: Response): Promise<any[] | { events?: any[]; logs?: any[] }> {
  if (!response.ok) return [];
  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const headers = buildProxyHeaders(request);
    const serviceList = await getAllServices();
    const serviceByName = new Map(serviceList.map((service) => [service.name.toLowerCase(), service]));

    const [cateringResponse, costResponse, couponsResponse] = await Promise.allSettled([
      fetch(new URL("/api/data/catering/activity", request.url), {
        cache: "no-store",
        headers,
      }),
      fetch(new URL("/api/data/cost-mgmt/activity?limit=20", request.url), {
        cache: "no-store",
        headers,
      }),
      fetch(new URL("/api/data/coupons/activity?limit=20", request.url), {
        cache: "no-store",
        headers,
      }),
    ]);

    const activityItems: ActivityItem[] = [];

    if (cateringResponse.status === "fulfilled") {
      const payload = (await safeJsonResponse(cateringResponse.value)) as any[];
      payload.forEach((log) => {
        const proposalId = String(log.proposalId || "");
        activityItems.push({
          id: String(log.logId || `${proposalId}-${log.timestamp}`),
          source: "catering",
          appName: "Catering",
          action: String(log.action || "Activity"),
          title: proposalId ? `Proposal ${proposalId}` : "Proposal activity",
          details: String(log.details || "Updated catering proposal"),
          timestamp: normalizeTimestamp(log.timestamp),
          href: proposalId
            ? getActivityEntityUrl("Catering", `/proposal/${encodeURIComponent(proposalId)}`, {
                serviceRedirectUrl: serviceByName.get("catering")?.redirect_url,
              })
            : getActivityEntityUrl("Catering", "/", {
                serviceRedirectUrl: serviceByName.get("catering")?.redirect_url,
              }),
        });
      });
    }

    if (costResponse.status === "fulfilled") {
      const payload = (await safeJsonResponse(costResponse.value)) as { logs?: any[] };
      (payload.logs || []).forEach((log) => {
        const productId = String(log.product_id || "");
        activityItems.push({
          id: String(log.log_id || `${log.entity_id || productId}-${log.timestamp}`),
          source: "cost-mgmt",
          appName: "Cost Mgmt",
          action: String(log.action || "Activity"),
          title: productId ? `Product ${productId}` : "Cost management activity",
          details: String(log.details || "Updated cost management data"),
          timestamp: normalizeTimestamp(log.timestamp),
          href: productId
            ? getActivityEntityUrl("Cost Mgmt", `/dashboard/events?product_id=${encodeURIComponent(productId)}`, {
                serviceRedirectUrl: serviceByName.get("cost mgmt")?.redirect_url || serviceByName.get("cost-mgmt")?.redirect_url,
              })
            : getActivityEntityUrl("Cost Mgmt", "/dashboard/events", {
                serviceRedirectUrl: serviceByName.get("cost mgmt")?.redirect_url || serviceByName.get("cost-mgmt")?.redirect_url,
              }),
        });
      });
    }

    if (couponsResponse.status === "fulfilled") {
      const payload = (await safeJsonResponse(couponsResponse.value)) as { logs?: any[] };
      (payload.logs || []).forEach((log, index) => {
        const actionText = String(log.action || "Coupon activity");
        const lowerAction = actionText.toLowerCase();
        const targetPath = lowerAction.includes("coupon")
          ? "/dashboard/coupons"
          : lowerAction.includes("config") || lowerAction.includes("settings")
            ? "/dashboard/settings"
            : "/dashboard";

        activityItems.push({
          id: String(log.logId || log.timestamp || index),
          source: "coupons",
          appName: "Coupons",
          action: actionText,
          title: String(log.couponCode || "Coupon activity"),
          details: String(log.details || "Logged coupon-related activity"),
          timestamp: normalizeTimestamp(log.timestamp),
          href: getActivityEntityUrl("Coupons", targetPath, {
            serviceRedirectUrl: serviceByName.get("coupons")?.redirect_url,
          }),
        });
      });
    }

    activityItems.sort((a, b) => toIsoValue(b.timestamp) - toIsoValue(a.timestamp));

    return NextResponse.json({ activities: activityItems.slice(0, 18) });
  } catch (error: any) {
    console.error("Failed to fetch dashboard activity:", error);
    return NextResponse.json(
      { error: `Failed to fetch activity stream: ${error.message}` },
      { status: 500 },
    );
  }
}
