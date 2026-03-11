import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatNotificationContext = createContext();

export const useChatNotifications = () => useContext(ChatNotificationContext);

export const ChatNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(new Set());

  const addNotification = useCallback((userId) => {
    setNotifications(prev => new Set(prev).add(userId));
  }, []);

  const removeNotification = useCallback((userId) => {
    setNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, []);

  const setInitialNotifications = useCallback((userIds) => {
    setNotifications(new Set(userIds));
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    setInitialNotifications,
    count: notifications.size,
  };

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
};