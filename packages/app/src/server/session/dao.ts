import { and, Database, SQL } from "../../storage/db"
import { Session, type Message, type Part } from "./model"
import { MessageTable, PartTable, SessionTable } from "./sql"
import { eq, desc, inArray } from "../../storage/db"
import { NotFoundError } from "../../util/error"
import { Bus } from "../../util/bus"

class SessionModel {
    async createSession(session: Session) {
        Database.use((db) => {
            db
                .insert(SessionTable)
                .values({
                    id: session.id,
                    project_id: session.projectId,
                    title: session.title,
                })
                .onConflictDoUpdate({
                    target: SessionTable.id,
                    set: { title: session.title },
                })
                .run()
        })

        return session
    }

    async *listSessions(query: {
        limit?: number
    }): AsyncIterable<Session> {
        const conditions: SQL[] = []

        const limit = query.limit ?? 100;

        const rows = Database.use((db) => db
            .select()
            .from(SessionTable)
            .where(and(...conditions))
            .orderBy(desc(SessionTable.updated_at))
            .limit(limit)
            .all(),
        )

        for (const row of rows) {
            yield {
                id: row.id,
                title: row.title,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            } as Session
        }
    }

    async getSession(sessionId: string) {
        const row = Database.use((db) => db.select().from(SessionTable).where(eq(SessionTable.id, sessionId)).get())

        if (!row) throw new NotFoundError({ message: `Session not found: ${sessionId}` })

        return row
    }

    async deleteSession(sessionId: string) {
        const session = await this.getSession(sessionId)

        Database.use((db) => {
            db.delete(SessionTable).where(eq(SessionTable.id, sessionId)).run()
            Database.effect(() => {
                Bus.publish({ type: "session.deleted", properties: { info: session } })
            })
        })
    }
}

class MessageModel {
    async updateMessage(message: Message) {
        const { id, sessionId, ...data } = message

        Database.use((db) => {
            db
                .insert(MessageTable)
                .values({
                    id,
                    session_id: sessionId,
                    data,
                })
                .onConflictDoUpdate({
                    target: MessageTable.id,
                    set: { data },
                })
                .run()
        })

        return message
    }

    async *getMessages(sessionId: string) {
        const size = 50
        let offset = 0
        while (true) {
            const rows = Database.use((db) =>
                db
                    .select()
                    .from(MessageTable)
                    .where(eq(MessageTable.session_id, sessionId))
                    .orderBy(desc(MessageTable.created_at))
                    .limit(size)
                    .offset(offset)
                    .all(),
            )
            if (rows.length === 0) break

            const ids = rows.map((row) => row.id)
            const partsByMessage = new Map<string, Part[]>()
            if (ids.length > 0) {
                const partRows = Database.use((db) =>
                    db
                        .select()
                        .from(PartTable)
                        .where(inArray(PartTable.message_id, ids))
                        .orderBy(PartTable.message_id, PartTable.id)
                        .all(),
                )
                for (const row of partRows) {
                    const part = {
                        ...row.data,
                        id: row.id,
                        sessionId: row.session_id,
                        messageId: row.message_id,
                    } as Part
                    const list = partsByMessage.get(row.message_id)
                    if (list) list.push(part)
                    else partsByMessage.set(row.message_id, [part])
                }
            }

            for (const row of rows) {
                const message = { ...row.data, id: row.id, sessionId: row.session_id } as Message
                yield {
                    message,
                    parts: partsByMessage.get(row.id) ?? [],
                }
            }

            offset += rows.length
            if (rows.length < size) break
        }
    }
}

class PartModel {
    async updatePart(part: Part) {
        const { id, sessionId, messageId, ...data } = part

        Database.use((db) => {
            db
                .insert(PartTable)
                .values({
                    id,
                    session_id: sessionId,
                    message_id: messageId,
                    data
                })
                .onConflictDoUpdate({ target: PartTable.id, set: { data } })
                .run()
        })

        Bus.publish({
            type: "session.part.updated",
            properties: {
                part: structuredClone(part),
            },
        })

        return part
    }

    async getParts(messageId: string): Promise<Part[]> {
        const rows = Database.use((db) =>
            db.select().from(PartTable).where(eq(PartTable.message_id, messageId)).orderBy(PartTable.id).all(),
        )

        return rows.map((row) => ({
            ...row.data,
            id: row.id,
            sessionId: row.session_id,
            messageId: row.message_id,
        }) as Part)
    }

    async updatePartDelta(input: {
        sessionId: string
        messageId: string
        partId: string
        field: string
        delta: string
    }) {
        Bus.publish({
            type: "session.part.delta",
            properties: input,
        })
    }
}

export const sessionModel = new SessionModel()
export const messageModel = new MessageModel()
export const partModel = new PartModel()