import Snackbar from '@mui/material/Snackbar';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '../assets/icons/icon-close.svg'; // Nút đóng
import ErrorIcon from '../assets/icons/icon-close-red.svg'; // Icon lỗi

const ToastNotification = ({ open = true, handleClose = () => {}, message = '' }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      classes={{ root: 'customSnackbar' }}
    >
      <Box
        sx={{
          width: 288,
          height: 40,
          backgroundColor: '#303036',
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderRadius: '4px',
          boxSizing: 'border-box',
          marginTop: '12px',
        }}
      >
        <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
          <img src={ErrorIcon} alt="error-icon" style={{ width: 24, height: 24 }} />
        </IconButton>
        <span style={{ color: 'white', flexGrow: 1, marginLeft: '8px' }}>{message}</span>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
          <img src={CloseIcon} alt="close-icon" style={{ width: 20, height: 20 }} />
        </IconButton>
      </Box>
    </Snackbar>
  );
};

export default ToastNotification;
