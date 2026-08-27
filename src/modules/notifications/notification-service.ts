import "server-only";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";

type NotificationDb = Pick<typeof db, "insert">;

export async function createNotification(db: NotificationDb, input: { recipientUserId: string; eventType: string; relatedRecordType?: string; relatedRecordId?: string }) {
  await db.insert(notifications).values(input);
}
