import { Text } from "ink";

import { useNotification, type NotificationPriority } from "@/hooks/useNotification";
import { useTheme } from "@/hooks/useTheme";

const NotificationMessage = () => {
  const { notification } = useNotification();
  const { colors } = useTheme();

  if (notification === null) return null;

  const priorityColor: Record<NotificationPriority, string> = {
    low: colors.muted,
    medium: colors.warning,
    high: colors.danger,
  };

  return <Text color={priorityColor[notification.priority]}>{notification.message}</Text>;
};

export default NotificationMessage;
