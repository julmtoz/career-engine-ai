import { createFileRoute, redirect } from "@tanstack/react-router";
import { completeGmailOAuth } from "@/lib/integrations.functions";

export const Route = createFileRoute("/auth/callback/gmail")({
  ssr: false,
  validateSearch: (search) => ({
    code: (search as any).code as string | undefined,
    state: (search as any).state as string | undefined,
    error: (search as any).error as string | undefined,
  }),
  beforeLoad: async ({ search }) => {
    // Handle errors from Google
    if (search.error) {
      console.error("Gmail OAuth error:", search.error);
      throw redirect({
        to: "/settings/integrations",
        search: { error: "Gmail connection failed" },
      });
    }

    if (!search.code || !search.state) {
      throw redirect({
        to: "/settings/integrations",
        search: { error: "No authorization code received" },
      });
    }

    try {
      await completeGmailOAuth({ data: { code: search.code, state: search.state } });
    } catch (err) {
      console.error("Gmail OAuth exchange failed:", err);
      throw redirect({
        to: "/settings/integrations",
        search: { error: "Gmail connection failed" },
      });
    }

    throw redirect({
      to: "/settings/integrations",
      search: { success: "Gmail connected successfully" },
    });
  },
  component: () => null,
});
