import * as notificationRepository from "@/modules/notifications/infrastructure/notification-repository";
import { resolveMemberProfiles } from "@/modules/members/application/member-directory";

export async function listNotifications(memberId: string, options?: { unreadOnly?: boolean }) {
  const notifications = await notificationRepository.listNotifications(memberId, options);
  const profiles = await resolveMemberProfiles(
    notifications.flatMap((notification) =>
      notification.actorMemberId ? [notification.actorMemberId] : []
    )
  );
  return notifications.map((notification) => ({
    ...notification,
    actorName: notification.actorMemberId
      ? profiles.get(notification.actorMemberId)?.name ?? null
      : null,
    reactorCount: notification.skillLevelChange?._count.reactions ?? null
  }));
}

export function countUnreadNotifications(memberId: string) {
  return notificationRepository.countUnreadNotifications(memberId);
}

export function listLatestUnreadNotifications(memberId: string, limit = 5) {
  return notificationRepository.listLatestUnreadNotifications(memberId, limit);
}

export function findNotification(id: string, memberId: string) {
  return notificationRepository.findNotification(id, memberId);
}

export function markNotificationRead(id: string, memberId: string) {
  return notificationRepository.markNotificationRead(id, memberId);
}

export function markAllNotificationsRead(memberId: string) {
  return notificationRepository.markAllNotificationsRead(memberId);
}
