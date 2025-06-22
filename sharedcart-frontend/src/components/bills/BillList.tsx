// frontend/src/components/bills/BillList.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Skeleton,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Bill, Group } from '../../types';

interface BillListProps {
  bills: Bill[];
  loading: boolean;
  onEdit: (bill: Bill) => void;
  onDelete: (billId: number) => void;
  onView: (bill: Bill) => void;
  selectedGroup: Group | null;
}

const BillList: React.FC<BillListProps> = ({
  bills,
  loading,
  onEdit,
  onDelete,
  onView,
  selectedGroup,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, bill: Bill) => {
    setAnchorEl(event.currentTarget);
    setSelectedBill(bill);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBill(null);
  };

  const handleEdit = () => {
    if (selectedBill) {
      onEdit(selectedBill);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedBill) {
      onDelete(selectedBill.id);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedBill) {
      onView(selectedBill);
    }
    handleMenuClose();
  };

  // Filter bills based on search term and status
  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.paid_by?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginate filtered bills
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'finalized':
        return 'info';
      case 'settled':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ReceiptIcon fontSize="small" />;
      case 'finalized':
        return <EditIcon fontSize="small" />;
      case 'settled':
        return <MoneyIcon fontSize="small" />;
      default:
        return <ReceiptIcon fontSize="small" />;
    }
  };

  if (loading) {
    return (
      <Box>
        {[...Array(5)].map((_, index) => (
          <Card key={index} sx={{ mb: 2 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="30%" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search bills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="finalized">Finalized</MenuItem>
            <MenuItem value="settled">Settled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Bills List */}
      {paginatedBills.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <ReceiptIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {bills.length === 0 ? 'No bills found' : 'No bills match your search'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {bills.length === 0 
                ? selectedGroup 
                  ? `Create your first bill for ${selectedGroup.name}` 
                  : 'Select a group to view bills'
                : 'Try adjusting your search criteria'
              }
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {paginatedBills.map((bill) => (
            <Card key={bill.id} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => onView(bill)}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {bill.title}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(bill.status)}
                        label={bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                        color={getStatusColor(bill.status) as any}
                        size="small"
                      />
                    </Box>
                    
                    {bill.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {bill.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(bill.bill_date), 'MMM dd, yyyy')}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {bill.paid_by?.name || 'Unknown'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={5}>
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                        ${parseFloat(bill.total_amount).toFixed(2)}
                      </Typography>
                      
                      {bill.items && bill.items.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          {bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                        </Typography>
                      )}
                      
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                        {bill.items?.slice(0, 3).map((item, index) => (
                          <Tooltip key={index} title={`${item.name} - $${parseFloat(item.amount).toFixed(2)}`}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                              {item.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                        {bill.items && bill.items.length > 3 && (
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                            +{bill.items.length - 3}
                          </Avatar>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, bill);
                      }}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        <MenuItem onClick={handleEdit} disabled={selectedBill?.status === 'settled'}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit Bill
        </MenuItem>
        <MenuItem onClick={handleDelete} disabled={selectedBill?.status === 'settled'}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete Bill
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default BillList;
