'use client';

import React from 'react';
import { useNotifications } from './useNotifications';
import NotificationCenterView from './NotificationCenterView';

export default function NotificationCenter() {
  const notifications = useNotifications();

  return <NotificationCenterView {...notifications} />;
}
