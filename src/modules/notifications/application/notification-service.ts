import * as notificationRepository from "@/modules/notifications/infrastructure/notification-repository";

export function listNotifications(memberId: string) {
  return notificationRepository.listNotifications(memberId);
}

export function markNotificationRead(id: string, memberId: string) {
  return notificationRepository.markNotificationRead(id, memberId);
}
