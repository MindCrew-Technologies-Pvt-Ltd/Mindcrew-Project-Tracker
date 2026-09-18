import prisma from '../config/prisma';
import { sendPushNotification } from '../config/firebase';
import { sendWebPushNotification } from '../services/webPush.service';

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
    const user = await prisma.user.findUnique({ 
      where: { id: params.userId }, 
      select: { fcmToken: true, pushSubscription: true } 
    });
    
    if (user?.fcmToken) {
      await sendPushNotification(user.fcmToken, params.title, params.message);
    }
    if (user?.pushSubscription) {
      await sendWebPushNotification(user.pushSubscription, {
        title: params.title,
        body: params.message,
        url: '/'
      }).catch(err => {
        if (err.isGone) {
          prisma.user.update({ where: { id: params.userId }, data: { pushSubscription: null } }).catch(() => {});
        }
      });
    }
  } catch (error) {
    console.error('Error in createNotification:', error);
  }
};
