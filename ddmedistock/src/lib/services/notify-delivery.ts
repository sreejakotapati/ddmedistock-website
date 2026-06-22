// Notification delivery worker payload handler.
//
// Persists an in-app notification (the existing channel). Realtime (Socket.IO)
// and push (FCM) fan-out plug in here in Phase 6. Separated from audit.ts's
// notify() so the queue worker has a stable, serializable entry point.

import { notify } from "./audit";

export type NotificationJob = {
  userId: string;
  title: string;
  body?: string;
  link?: string;
  type?: string;
};

export async function deliverNotification(job: NotificationJob): Promise<void> {
  await notify(job.userId, job.title, job.body ?? "", job.link, job.type ?? "INFO");
}
