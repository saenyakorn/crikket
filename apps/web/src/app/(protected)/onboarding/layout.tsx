import { redirect } from "next/navigation"

import { getProtectedAuthData } from "@/app/(protected)/_lib/get-protected-auth-data"
import { createServerLogger } from "@/lib/server-logger"

const logger = createServerLogger("onboarding-layout")

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { organizations, session } = await getProtectedAuthData()

  if (organizations.length > 0) {
    logger.warn("redirecting to / (organizations already exist)", {
      userId: session?.user.id ?? null,
      organizationCount: organizations.length,
      organizationIds: organizations.map((org) => org.id),
      target: "/",
    })
    redirect("/")
  }

  logger.debug("allowing onboarding render", {
    userId: session?.user.id ?? null,
  })

  return children
}
