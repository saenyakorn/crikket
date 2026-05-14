import { cache } from "react"

type LogLevel = "debug" | "info" | "warn" | "error"
type LogFields = Readonly<Record<string, unknown>>

const LOG_PREFIX = "[web-server]"

const cachedRequestLogId = cache(
  (): string =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
)

export function getRequestLogId(): string {
  try {
    return cachedRequestLogId()
  } catch {
    return "outside-request"
  }
}

export interface ServerLogger {
  readonly debug: (message: string, fields?: LogFields) => void
  readonly info: (message: string, fields?: LogFields) => void
  readonly warn: (message: string, fields?: LogFields) => void
  readonly error: (message: string, fields?: LogFields) => void
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({ unserializable: true })
  }
}

function emit(
  scope: string,
  level: LogLevel,
  message: string,
  fields: LogFields | undefined
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    requestId: getRequestLogId(),
    message,
    ...fields,
  }

  const line = `${LOG_PREFIX} ${safeStringify(payload)}`

  if (level === "error") {
    console.error(line)
    return
  }

  if (level === "warn") {
    console.warn(line)
    return
  }

  console.log(line)
}

export function createServerLogger(scope: string): ServerLogger {
  return {
    debug: (message, fields) => {
      emit(scope, "debug", message, fields)
    },
    info: (message, fields) => {
      emit(scope, "info", message, fields)
    },
    warn: (message, fields) => {
      emit(scope, "warn", message, fields)
    },
    error: (message, fields) => {
      emit(scope, "error", message, fields)
    },
  }
}

export function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    }
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message
    return {
      errorMessage:
        typeof maybeMessage === "string" ? maybeMessage : safeStringify(error),
    }
  }

  return { errorMessage: String(error) }
}
