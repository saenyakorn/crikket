import { authClient } from "@crikket/auth/client"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { VerifyEmailForm } from "@/components/auth/verify-email-form"
import { createServerLogger, describeError } from "@/lib/server-logger"

const logger = createServerLogger("verify-email-page")

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to secure your Crikket account.",
}

export default async function VerifyEmailPage() {
  const sessionResponse = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  })

  if (sessionResponse.error) {
    logger.error(
      "getSession returned error",
      describeError(sessionResponse.error)
    )
  }

  const session = sessionResponse.data

  if (!session) {
    logger.warn("redirecting to /login (no session)", { target: "/login" })
    redirect("/login")
  }

  if (session.user.emailVerified) {
    logger.info("redirecting to / (email already verified)", {
      userId: session.user.id,
      target: "/",
    })
    redirect("/")
  }

  logger.debug("rendering verify email form", {
    userId: session.user.id,
  })

  return <VerifyEmailForm email={session.user.email} />
}
