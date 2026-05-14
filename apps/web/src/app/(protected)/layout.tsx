import { redirect } from "next/navigation"

import { getProtectedAuthData } from "@/app/(protected)/_lib/get-protected-auth-data"
import { createServerLogger } from "@/lib/server-logger"

const logger = createServerLogger("protected-layout")

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session } = await getProtectedAuthData()

  if (!session) {
    logger.warn("redirecting to /login (no session)", { target: "/login" })
    redirect("/login")
  }

  logger.debug("allowing protected render", {
    userId: session.user.id,
  })

  return children
}
