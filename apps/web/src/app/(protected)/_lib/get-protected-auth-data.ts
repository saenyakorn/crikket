import { authClient } from "@crikket/auth/client"
import { headers } from "next/headers"
import { cache } from "react"

import { createServerLogger, describeError } from "@/lib/server-logger"

const logger = createServerLogger("protected-auth-data")

function extractCookieNames(cookieHeader: string | null): readonly string[] {
  if (!cookieHeader) {
    return []
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim().split("=")[0] ?? "")
    .filter((name) => name.length > 0)
}

export const getProtectedAuthData = cache(async () => {
  const requestHeaders = await headers()
  const cookieHeader = requestHeaders.get("cookie")
  const cookieNames = extractCookieNames(cookieHeader)
  const hasBetterAuthCookie = cookieNames.some((name) =>
    name.startsWith("better-auth")
  )

  logger.info("fetching session", {
    cookieCount: cookieNames.length,
    cookieNames,
    hasBetterAuthCookie,
  })

  const sessionStartedAt = Date.now()
  const sessionResponse = await authClient.getSession({
    fetchOptions: {
      headers: requestHeaders,
    },
  })
  const sessionDurationMs = Date.now() - sessionStartedAt

  if (sessionResponse.error) {
    logger.error("getSession returned error", {
      durationMs: sessionDurationMs,
      ...describeError(sessionResponse.error),
    })
  }

  const session = sessionResponse.data

  if (!session) {
    logger.warn("no session returned", {
      durationMs: sessionDurationMs,
      hadBetterAuthCookie: hasBetterAuthCookie,
    })

    return {
      organizations: [],
      session: null,
    }
  }

  logger.info("session fetched", {
    durationMs: sessionDurationMs,
    userId: session.user.id,
    emailVerified: session.user.emailVerified,
    sessionId: session.session.id,
    activeOrganizationId: session.session.activeOrganizationId ?? null,
    expiresAt:
      session.session.expiresAt instanceof Date
        ? session.session.expiresAt.toISOString()
        : session.session.expiresAt,
  })

  const orgsStartedAt = Date.now()
  const organizationsResponse = await authClient.organization.list({
    fetchOptions: {
      headers: requestHeaders,
    },
  })
  const orgsDurationMs = Date.now() - orgsStartedAt

  if (organizationsResponse.error) {
    logger.error("organization.list returned error", {
      durationMs: orgsDurationMs,
      userId: session.user.id,
      ...describeError(organizationsResponse.error),
    })
  }

  const organizations = organizationsResponse.data ?? []

  logger.info("organizations fetched", {
    durationMs: orgsDurationMs,
    userId: session.user.id,
    organizationCount: organizations.length,
    organizationIds: organizations.map((org) => org.id),
  })

  return {
    organizations,
    session,
  }
})
