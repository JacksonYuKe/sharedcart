// frontend/src/pages/DashboardPage.tsx
import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { fetchGroups } from '../store/slices/groupsSlice';
import { fetchBills } from '../store/slices/billsSlice';
import Dashboard from '../components/dashboard/Dashboard';
import { Alert } from '@mui/material';

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { groups, isLoading: groupsLoading } = useAppSelector(state => state.groups);
  const { bills, isLoading: billsLoading } = useAppSelector(state => state.bills);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  // Fetch bills for all groups
  useEffect(() => {
    if (groups.length > 0) {
      groups.forEach(group => {
        dispatch(fetchBills({ groupId: group.id }));
      });
    }
  }, [dispatch, groups]);

  if (!user) {
    return (
      <Alert severity="error">
        Please log in to view the dashboard.
      </Alert>
    );
  }

  return (
    <Dashboard
      user={user}
      groups={groups}
      bills={bills}
      loading={groupsLoading || billsLoading}
    />
  );
};

export default DashboardPage;
