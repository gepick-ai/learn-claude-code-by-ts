import z from "zod"

/**
 * `NamedError` is used to create typed, serializable error classes that can be
 * handled by `name` and safely returned as JSON.
 *
 * The main API is `NamedError.create(name, data)`: the `name` parameter is the
 * stable error `name` used for runtime checks and serialized output, and the
 * `data` parameter is a Zod schema that describes the structured payload
 * carried by this error.
 *
 * Example 1: when a module needs a domain-specific error, create one with
 * `NamedError.create` and throw it in that module's exceptional path.
 * ```ts
 * const NotFoundError = NamedError.create("NotFoundError", z.object({ message: z.string() }))
 *
 * throw new NotFoundError({ message: "Session not found" })
 * ```
 *
 * Example 2: use `schema()` on the deserialization path, when the value comes
 * from outside the current type-safe runtime, such as storage, a message queue,
 * or another process. In those cases the value is only unknown JSON, so parse
 * it before trusting its error `name` or payload.
 * ```ts
 * const input = JSON.parse(rawMessage)
 *
 * const parsed = NotFoundError.Schema.parse(input)
 * // parsed is { name: "NotFoundError", data: { message: "Session not found" } }
 * ```
 *
 * Example 3: use `toObject()` on the serialization path, when code already has
 * a trusted error instance and needs to send it across a JSON boundary, such as
 * an HTTP response. It converts the instance to the stable JSON shape
 * `{ name, data }`.
 * ```ts
 * const error = new NotFoundError({ message: "Session not found" })
 *
 * return c.json(error.toObject(), 404)
 * ```
 */
export abstract class NamedError extends Error {

  static create<Name extends string, Data extends z.core.$ZodType>(name: Name, data: Data) {
    const schema = z
      .object({
        name: z.literal(name),
        data,
      })
      .meta({
        ref: name,
      })

    const result = class extends NamedError {
      public static readonly Schema = schema

      public override readonly name = name as Name

      constructor(
        public readonly data: z.input<Data>,
        options?: ErrorOptions,
      ) {
        super(name, options)
        this.name = name
      }

      /**
       * Narrows an unknown error by this concrete error type's stable `name`.
       * Use `SomeError.is(error)` when handling multiple NamedError subclasses.
       */
      static is(input: unknown): input is InstanceType<typeof result> {
        return typeof input === "object" && input !== null && "name" in input && input.name === name
      }

      schema() {
        return schema
      }

      toObject() {
        return {
          name: name,
          data: this.data,
        }
      }
    }
    Object.defineProperty(result, "name", { value: name })

    return result
  }

  /**
   * Returns the Zod schema for the serialized `{ name, data }` shape.
   * Use this on the deserialization path to validate unknown JSON before trusting it.
   *
   * Example:
   * ```ts
   * const input = JSON.parse(rawMessage)
   *
   * const parsed = NotFoundError.Schema.parse(input)
   * // parsed is { name: "NotFoundError", data: { message: "Session not found" } }
   * ```
   */
  abstract schema(): z.core.$ZodType

  /**
   * Converts this error instance into the stable `{ name, data }` JSON shape.
   * Use this on the serialization path before returning or sending the error.
   *
   * Example:
   * ```ts
   * const error = new NotFoundError({ message: "Session not found" })
   *
   * return c.json(error.toObject(), 404)
   * ```
   */
  abstract toObject(): { name: string; data: any }
}

export const UnknownError = NamedError.create(
  "UnknownError",
  z.object({
    message: z.string(),
  }),
)
