import prisma from '../config/prisma';
import { sendPushNotification } from '../config/firebase';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  projectId?: string;
  relatedId?: string;
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type as 'SYSTEM',
        projectId: params.projectId,
        relatedId: params.relatedId,
      },
    });
    const user = await prisma.user.findUnique({ where: { id: params.userId }, select: { fcmToken: true } });
    if (user?.fcmToken) {
      await sendPushNotification(user.fcmToken, params.title, params.message);
    }
  } catch {
    // swallow
  }
};
