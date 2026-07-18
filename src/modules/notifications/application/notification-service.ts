import * as notificationRepository from "@/modules/notifications/infrastructure/notification-repository";

export function listNotifications(memberId: string) {
  return notificationRepository.listNotifications(memberId);
}

export function countUnreadNotifications(memberId: string) {
  return notificationRepository.countUnreadNotifications(memberId);
}

export function findNotification(id: string, memberId: string) {
  return notificationRepository.findNotification(id, memberId);
}

export function markNotificationRead(id: string, memberId: string) {
  return notificationRepository.markNotificationRead(id, memberId);
}
