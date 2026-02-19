import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { getServiceById } from "@/lib/services";
import { createAuthCode } from "@/lib/authCodes";

interface PageProps {
  searchParams: Promise<{
    service_id?: string;
    redirect_uri?: string;
    state?: string;
  }>;
}

export default async function AuthorizePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { service_id, redirect_uri, state } = params;

  // Validate required parameters
  if (!service_id || !redirect_uri) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6">
        <div className="bg-white/5 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Invalid Request
          </h2>
          <p className="text-red-300 mb-6">
            Missing required parameters: service_id and redirect_uri
          </p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get("sso_token")?.value;

  if (!token) {
    // Not logged in - redirect to login with return URL
    const returnUrl = `/authorize?service_id=${service_id}&redirect_uri=${encodeURIComponent(redirect_uri)}${state ? `&state=${state}` : ""}`;
    redirect(`/login?return_url=${encodeURIComponent(returnUrl)}`);
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    // Invalid token - redirect to login
    const returnUrl = `/authorize?service_id=${service_id}&redirect_uri=${encodeURIComponent(redirect_uri)}${state ? `&state=${state}` : ""}`;
    redirect(`/login?return_url=${encodeURIComponent(returnUrl)}`);
  }

  // Validate service exists
  const service = await getServiceById(service_id);
  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6">
        <div className="bg-white/5 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Invalid Service
          </h2>
          <p className="text-red-300 mb-6">
            The requested service does not exist.
          </p>
        </div>
      </div>
    );
  }

  // Validate redirect_uri matches registered URL
  if (service.redirect_url !== redirect_uri) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6">
        <div className="bg-white/5 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Invalid Redirect URI
          </h2>
          <p className="text-red-300 mb-6">
            The redirect URI does not match the registered URL for this service.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has access to this service
  const userRoles = payload.roles || [];
  const isAdmin = userRoles.includes("admin");
  const hasFreeAccess = service.free_tier_enabled === "true";

  if (!isAdmin && !hasFreeAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-6">
        <div className="bg-white/5 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-red-300 mb-6">
            You do not have permission to access this service.
          </p>
        </div>
      </div>
    );
  }

  // Generate authorization code
  const code = await createAuthCode(payload.user_id, service_id, redirect_uri);

  // Build redirect URL with code and state
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) {
    redirectUrl.searchParams.set("state", state);
  }

  // Redirect to client app
  redirect(redirectUrl.toString());
}
