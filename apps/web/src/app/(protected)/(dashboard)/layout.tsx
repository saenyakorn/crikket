import { authClient } from "@crikket/auth/client"
import { ModeToggle } from "@crikket/ui/components/mode-toggle"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@crikket/ui/components/ui/sidebar"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getProtectedAuthData } from "@/app/(protected)/_lib/get-protected-auth-data"
import { DashboardPricingGate } from "@/app/(protected)/(dashboard)/_components/dashboard-pricing-gate"
import { AppSidebar } from "@/components/app-sidebar"
import { UnverifiedEmailBanner } from "@/components/auth/unverified-email-banner"
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs"
import { Shell } from "@/components/shell"
import { createServerLogger } from "@/lib/server-logger"
import { client } from "@/utils/orpc"

const logger = createServerLogger("dashboard-layout")

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { organizations, session } = await getProtectedAuthData()

  if (!session) {
    logger.warn("redirecting to /login (no session)", { target: "/login" })
    redirect("/login")
  }

  if (organizations.length === 0) {
    logger.warn("redirecting to /onboarding (no organizations)", {
      userId: session.user.id,
      target: "/onboarding",
    })
    redirect("/onboarding")
  }

  const activeOrganization =
    organizations.find(
      (organization) => organization.id === session.session.activeOrganizationId
    ) ?? organizations[0]

  logger.debug("active organization resolved", {
    userId: session.user.id,
    sessionActiveOrganizationId: session.session.activeOrganizationId ?? null,
    resolvedActiveOrganizationId: activeOrganization.id,
    organizationCount: organizations.length,
  })
  const requestHeaders = await headers()
  const authFetchOptions = {
    fetchOptions: {
      headers: requestHeaders,
    },
  }
  const [billingSnapshot, activeMembership] = await Promise.all([
    client.billing.getCurrentOrganizationPlan({
      organizationId: activeOrganization.id,
    }),
    authClient.organization.getActiveMemberRole({
      query: {
        organizationId: activeOrganization.id,
      },
      ...authFetchOptions,
    }),
  ])
  const isDashboardLocked = billingSnapshot.plan === "free"
  const canManageBilling = activeMembership.data?.role === "owner"

  logger.info("rendering dashboard", {
    userId: session.user.id,
    organizationId: activeOrganization.id,
    plan: billingSnapshot.plan,
    isDashboardLocked,
    memberRole: activeMembership.data?.role ?? null,
  })

  return (
    <SidebarProvider className="min-h-svh items-stretch">
      <AppSidebar
        activeOrganization={activeOrganization}
        organizations={organizations}
        user={session.user}
      />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            {isDashboardLocked ? (
              <p className="font-medium text-sm">Upgrade workspace</p>
            ) : (
              <DashboardBreadcrumbs />
            )}
          </div>
          <ModeToggle />
        </header>
        <Shell>
          {session.user.emailVerified ? null : <UnverifiedEmailBanner />}
          {isDashboardLocked ? (
            <DashboardPricingGate
              canManageBilling={canManageBilling}
              organizationId={activeOrganization.id}
              organizationName={activeOrganization.name}
            />
          ) : (
            children
          )}
        </Shell>
      </SidebarInset>
    </SidebarProvider>
  )
}
