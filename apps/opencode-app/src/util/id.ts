import z from "zod"
import { randomBytes } from "crypto"

export namespace Identifier {
  const prefixes = {
    session: "ses",
    message: "msg",
    permission: "per",
    question: "que",
    user: "usr",
    part: "prt",
    pty: "pty",
    tool: "tool",
    workspace: "wrk",
  } as const

  export function schema(prefix: keyof typeof prefixes) {
    return z.string().startsWith(prefixes[prefix])
  }

  const LENGTH = 26
  let last = 0
  let count = 0

  export function ascending(prefix: keyof typeof prefixes, given?: string) {
    return generate(prefix, false, given)
  }

  export function descending(prefix: keyof typeof prefixes, given?: string) {
    return generate(prefix, true, given)
  }

  function generate(prefix: keyof typeof prefixes, descending: boolean, given?: string): string {
    if (!given) return create(prefix, descending)
    if (!given.startsWith(prefixes[prefix])) {
      throw new Error(`ID ${given} does not start with ${prefixes[prefix]}`)
    }
    return given
  }

  function randomBase62(length: number): string {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    let result = ""
    const bytes = randomBytes(length)
    for (let i = 0; i < length; i++) {
      const n = (bytes[i] ?? 0) % 62
      result += chars[n] ?? "0"
    }
    return result
  }

  export function create(prefix: keyof typeof prefixes, descending: boolean, timestamp?: number): string {
    const now = timestamp ?? Date.now()
    if (now !== last) {
      last = now
      count = 0
    }
    count++

    let value = BigInt(now) * BigInt(0x1000) + BigInt(count)
    value = descending ? ~value : value

    const bytes = Buffer.alloc(6)
    for (let i = 0; i < 6; i++) {
      bytes[i] = Number((value >> BigInt(40 - 8 * i)) & BigInt(0xff))
    }

    return prefixes[prefix] + "_" + bytes.toString("hex") + randomBase62(LENGTH - 12)
  }

  export function timestamp(id: string): number {
    const prefix = id.split("_")[0]
    const hex = id.slice(prefix!.length + 1, prefix!.length + 13)
    const encoded = BigInt("0x" + hex)
    return Number(encoded / BigInt(0x1000))
  }
}
