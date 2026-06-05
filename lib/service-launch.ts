type ServiceLike = {
  name: string;
  redirect_url?: string;
};

function isDevelopmentEnvironment(): boolean {
  return (process.env.APP_ENV || "dev").trim().toLowerCase() !== "prd";
}

function getConfiguredAppBaseUrl(serviceName: string): string | null {
  const normalized = serviceName.toLowerCase();

  if (normalized.includes("coupon")) {
    return process.env.NEXT_PUBLIC_COUPONS_APP_URL || null;
  }

  if (normalized.includes("cater")) {
    return process.env.NEXT_PUBLIC_CATERING_APP_URL || null;
  }

  if (normalized.includes("cost") || normalized.includes("mgmt")) {
    return process.env.NEXT_PUBLIC_COST_MGMT_APP_URL || null;
  }

  return null;
}

function getLocalAppBaseUrl(serviceName: string): string | null {
  const normalized = serviceName.toLowerCase();

  if (!isDevelopmentEnvironment()) {
    return getConfiguredAppBaseUrl(serviceName);
  }

  if (normalized.includes("coupon")) {
    return process.env.NEXT_PUBLIC_COUPONS_APP_URL || "http://localhost:3001";
  }

  if (normalized.includes("cater")) {
    return process.env.NEXT_PUBLIC_CATERING_APP_URL || "http://localhost:3002";
  }

  if (normalized.includes("cost") || normalized.includes("mgmt")) {
    return process.env.NEXT_PUBLIC_COST_MGMT_APP_URL || "http://localhost:3003";
  }

  return getConfiguredAppBaseUrl(serviceName);
}

export function getServiceLaunchUrl(service: ServiceLike): string {
  const localBaseUrl = getLocalAppBaseUrl(service.name);
  if (localBaseUrl) {
    return localBaseUrl.replace(/\/$/, "");
  }

  if (service.redirect_url) {
    try {
      return new URL(service.redirect_url).origin;
    } catch {
      return service.redirect_url.replace(/\/$/, "");
    }
  }

  return isDevelopmentEnvironment() ? "http://localhost:3000" : "/";
}

export function getActivityEntityUrl(
  serviceName: string,
  path: string,
  options: { serviceRedirectUrl?: string } = {},
): string {
  const localOrConfiguredBaseUrl = getLocalAppBaseUrl(serviceName);

  if (localOrConfiguredBaseUrl) {
    return `${localOrConfiguredBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  }

  if (options.serviceRedirectUrl) {
    try {
      const origin = new URL(options.serviceRedirectUrl).origin;
      return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
    } catch {
      return `${options.serviceRedirectUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
    }
  }

  return isDevelopmentEnvironment()
    ? `http://localhost:3000${path.startsWith("/") ? path : `/${path}`}`
    : path.startsWith("/")
      ? path
      : `/${path}`;
}