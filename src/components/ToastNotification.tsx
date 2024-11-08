import Snackbar from '@mui/material/Snackbar';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '../assets/icons/icon-close.svg'; // Nút đóng

const ToastNotification = ({
  open = true,
  handleClose = () => {},
  message = '',
  width = 0,
  height = 0,
  bg = '',
  icon = '',
}) => {
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
          width,
          height,
          backgroundColor: bg,
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderRadius: '4px',
          boxSizing: 'border-box',
          marginTop: '12px',
        }}
      >
        <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
          <img src={icon} alt="error-icon" style={{ width: 24, height: 24 }} />
        </IconButton>
        <span style={{ color: 'white', flexGrow: 1, marginLeft: '8px', fontSize: '14px' }}>{message}</span>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
          <img src={CloseIcon} alt="close-icon" style={{ width: 16, height: 16 }} />
        </IconButton>
      </Box>
    </Snackbar>
  );
};

export default ToastNotification;
