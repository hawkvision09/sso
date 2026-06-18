type ServiceLike = {
  name: string;
  redirect_url?: string;
};

function isDevelopmentEnvironment(): boolean {
  const env = process.env.NEXT_PUBLIC_APP_ENV || process.env.APP_ENV;
  if (env) {
    return env.trim().toLowerCase() !== "prd";
  }
  return process.env.NODE_ENV !== "production";
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

export function getServiceLaunchUrl(service: ServiceLike): string {
  const configuredBaseUrl = getConfiguredAppBaseUrl(service.name);
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
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
  const configuredBaseUrl = getConfiguredAppBaseUrl(serviceName);

  if (configuredBaseUrl) {
    return `${configuredBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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