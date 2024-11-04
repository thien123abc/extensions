import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import CloseIconGray from '../assets/icons/icon-close-gray.svg';

interface ConfirmationDialogProps {
  title: string;
  message: string;
  onClose?: () => void;
  onDelete?: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  title = '',
  message = '',
  onClose = () => null,
  onDelete = () => null,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const handleDelete = () => {
    onDelete();
    setIsOpen(false);
  };
  if (!isOpen) return null;
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgb(0 0 0 / 0%)',
        zIndex: 999,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#303036',
          width: '400px',
          height: '180px',
          borderRadius: '8px',
          boxShadow: '4px 2px 32px 0px #000000',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
        }}
      >
        {/* Hàng trên */}
        <Box
          sx={{
            width: '100%',
            height: '56px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Typography variant="body1" sx={{ color: 'white' }}>
            {title}
          </Typography>
          <img src={CloseIconGray} alt="Close" onClick={onClose} style={{ cursor: 'pointer' }} />
        </Box>
        <Box
          sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)', width: 'calc(100% + 48px)', marginLeft: '-24px' }}
        />

        {/* Hàng dưới */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            paddingTop: '8px',
          }}
        >
          <Typography variant="body2" sx={{ color: 'white', marginBottom: '16px', marginTop: '8px' }}>
            {message}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="contained"
              sx={{
                backgroundColor: '#494950',
                borderRadius: '4px',
                width: '168px',
                height: '40px',
                padding: '10px 28px',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#494950',
                  opacity: 0.8,
                },
              }}
              onClick={() => {
                onClose();
                setIsOpen(false);
              }}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="contained"
              sx={{
                backgroundColor: '#FD2F4A',
                borderRadius: '4px',
                width: '168px',
                height: '40px',
                padding: '10px 28px',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#FD2F4A',
                  opacity: 0.8,
                },
              }}
              onClick={handleDelete}
            >
              Xóa
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ConfirmationDialog;
