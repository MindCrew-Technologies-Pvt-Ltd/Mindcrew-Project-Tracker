import prisma from '../config/prisma';

interface ActivityLogParams {
  userId: string;
  action: string;
  module: string;
  description: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export const logActivity = async (params: ActivityLogParams): Promise<void> => {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        module: params.module,
        description: params.description,
        metadata: params.metadata as object | undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch {
    // swallow — logging must not break the main flow
  }
};
