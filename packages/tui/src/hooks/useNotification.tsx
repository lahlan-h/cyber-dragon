import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type NotificationPriority = "low" | "medium" | "high";

interface Notification {
  message: string;
  priority: NotificationPriority;
}

interface NotificationContextType {
  notification: Notification | null; // the front of the queue - what the footer shows
  notify: (message: string, priority?: NotificationPriority) => void;
  dismiss: () => void; // removes the front, so the next one shows
}

interface NotificationProps {
  children: ReactNode;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const DISMISS_AFTER_MS = 4000;
const MAX_QUEUED = 10; // if something floods notify, the oldest drop off
const RANK: Record<NotificationPriority, number> = { low: 0, medium: 1, high: 2 };

export const NotificationProvider = ({ children }: NotificationProps) => {
  const [queue, setQueue] = useState<Notification[]>([]);

  const notification = queue[0] ?? null; // the front of the queue is what's showing

  // join the queue, anything less important than the new one is dropped, so it shows straight away
  const notify = (message: string, priority: NotificationPriority = "low") =>
    setQueue((q) => {
      const kept = q.filter((n) => RANK[n.priority] >= RANK[priority]);
      return [...kept, { message, priority }].slice(-MAX_QUEUED);
    });

  // remove the front, so the next one moves up
  const dismiss = () => setQueue((q) => q.slice(1));

  // give whatever is at the front a few seconds, then move on.
  // adding to the back doesn't restart the clock, only a new front does.
  useEffect(() => {
    if (notification === null) return;
    const timer = setTimeout(dismiss, DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <NotificationContext.Provider value={{ notification, notify, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used inside <NotificationProvider>");
  return context;
};
