// frontend/src/components/dashboard/Dashboard.tsx
import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  Group as GroupIcon,
  Receipt as ReceiptIcon,
  AccountBalance as BalanceIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { Group, Bill, User } from '../../types';

interface DashboardProps {
  user: User;
  groups: Group[];
  bills: Bill[];
  loading: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  groups,
  bills,
  loading,
}) => {
  const totalGroupsCount = groups.length;
  const totalBillsCount = bills.length;
  const pendingBillsCount = bills.filter(bill => bill.status === 'pending').length;
  const totalAmount = bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0);

  const recentBills = [...bills]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentGroups = [...groups]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Loading Dashboard...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Welcome back, {user.name}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Here's what's happening with your shared expenses
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <GroupIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="primary">
                    {totalGroupsCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Groups
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <ReceiptIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="info.main">
                    {totalBillsCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Bills
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <BalanceIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {pendingBillsCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Bills
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="success.main">
                    ${totalAmount.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Expenses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Bills */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Bills
              </Typography>
              
              {recentBills.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No bills yet. Create your first bill to get started!
                </Typography>
              ) : (
                <Box>
                  {recentBills.map((bill) => (
                    <Box
                      key={bill.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': {
                          borderBottom: 'none',
                        },
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2">
                          {bill.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {bill.group?.name} • {bill.paid_by?.name}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" color="primary">
                          ${parseFloat(bill.total_amount).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {bill.status}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Groups */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Your Groups
              </Typography>
              
              {recentGroups.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No groups yet. Create or join a group to start tracking expenses!
                </Typography>
              ) : (
                <Box>
                  {recentGroups.map((group) => (
                    <Box
                      key={group.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': {
                          borderBottom: 'none',
                        },
                      }}
                    >
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                        {group.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">
                          {group.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {group.members?.length || 0} members
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
