import React, { useState } from 'react';
import { Box, Button, Input, TextField, Typography } from '@mui/material';
import CloseIconGray from '../assets/icons/icon-close-gray.svg';

interface ConfirmationDialogProps {
  title: string;
  message?: string;
  onClose?: () => void;
  onDelete?: () => void;
  isEditingTitle?: boolean;
  initialInputValue?: string;
  widthBox: string;
  heightBox: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  title = '',
  message = '',
  onClose = () => null,
  onDelete = () => null,
  isEditingTitle = false,
  initialInputValue = '',
  widthBox = '100%',
  heightBox = '100%',
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inputValue, setInputValue] = useState(initialInputValue);

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
          width: widthBox,
          height: heightBox,
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
            height: isEditingTitle ? '24px' : '56px',
            marginBottom: isEditingTitle ? '8px' : 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <Typography variant="body1" sx={{ color: 'white' }}>
            {title}
          </Typography>
          <img
            src={CloseIconGray}
            alt="Close"
            onClick={() => {
              onClose();
              setIsOpen(false);
            }}
            style={{ cursor: 'pointer' }}
          />
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
          {isEditingTitle ? (
            <Box
              sx={{
                width: '100%',
                height: '92px',
                display: 'flex',
                justifyContent: 'space-evenly',
                alignItems: 'flex-end',
                flexDirection: 'column',
              }}
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
                sx={{
                  width: '352px',
                  height: '40px',
                  backgroundColor: '#424242',
                  color: 'white',
                  border: '1px solid #94949E',
                  borderRadius: '4px',
                  padding: '0 12px',
                  '&:hover': {
                    borderColor: '#94949E',
                  },
                  '&:focus': {
                    borderColor: '#94949E',
                    outline: 'none',
                    textDecoration: 'none',
                  },
                  '& input': {
                    color: 'white',
                  },
                }}
                disableUnderline
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '-8px',
                }}
              >
                {inputValue.length} / 200
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'white', marginBottom: '16px', marginTop: '8px' }}>
              {message}
            </Typography>
          )}
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
              {isEditingTitle ? 'Lưu' : 'Xóa'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ConfirmationDialog;
