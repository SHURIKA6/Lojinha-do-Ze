'use client';

import React from 'react';
import { useCustomerManagement } from './hooks/useCustomerManagement';
import CustomerManagementView from './CustomerManagementView';

export default function CustomerManagement() {
  const management = useCustomerManagement();

  return <CustomerManagementView {...management} />;
}
