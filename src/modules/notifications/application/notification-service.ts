import * as notificationRepository from "@/modules/notifications/infrastructure/notification-repository";

export function listNotifications(memberId: string, options?: { unreadOnly?: boolean }) {
  return notificationRepository.listNotifications(memberId, options);
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
