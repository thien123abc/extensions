import React, { useRef, useState } from 'react';
import { Box, Button, FormHelperText, Input, Typography } from '@mui/material';
import CloseIconGray from '../assets/icons/icon-close-gray.svg';
import { MAX_CHAR_INPUT_LENGTH } from '../pages/HistoryScreen';
import { useOutsideClick } from '../hooks/useOutsideClick';
import LoadingIcon from '../assets/icons/loading-icon.svg';

interface ConfirmationDialogProps {
  title: string;
  message?: string;
  onClose: () => void;
  onClick: (arg?: any) => any;
  isEditingTitle?: boolean;
  isLoadingSave?: boolean;
  initialInputValue?: string;
  widthBox: string;
  heightBox: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  title = '',
  message = '',
  onClose,
  onClick,
  isEditingTitle = false,
  initialInputValue = '',
  widthBox = '100%',
  heightBox = '100%',
  isLoadingSave = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inputValue, setInputValue] = useState(initialInputValue);

  const wrapperRef = useRef(null);

  useOutsideClick(
    wrapperRef,
    () => {
      onClose();
      setIsOpen(false);
    },
    'customSnackbar',
  );

  const handleClick = () => {
    onClick(inputValue);
    !isEditingTitle && setIsOpen(false);
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
        ref={wrapperRef}
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
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <Input
                  value={inputValue}
                  onChange={(e) => {
                    if (e.target.value.length > MAX_CHAR_INPUT_LENGTH) return;
                    setInputValue(e.target.value);
                  }}
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
                {inputValue.length === 0 && (
                  <FormHelperText style={{ color: 'red', fontSize: '12px', position: 'absolute', bottom: '-24px' }}>
                    Tên hội thoại không được để trống
                  </FormHelperText>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '-8px',
                }}
              >
                {inputValue.length} / {MAX_CHAR_INPUT_LENGTH}
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
                '&:disabled': {
                  cursor: 'not-allowed', // Đổi con trỏ chuột khi button disabled
                  opacity: 0.6, // Giảm độ mờ của button khi disabled (có thể thay đổi giá trị này)
                  backgroundColor: '#FD2F4A', // Giữ màu nền là đỏ
                  color: 'white', // Giữ chữ trắng
                },
              }}
              onClick={handleClick}
              disabled={
                isEditingTitle
                  ? inputValue === initialInputValue || inputValue.trim().length === 0 || isLoadingSave
                  : false
              }
            >
              {isEditingTitle ? (
                isLoadingSave ? (
                  <div style={spinnerStyle}>
                    <style>{keyframesStyle}</style>
                    <img src={LoadingIcon} alt="icon-loading" style={imgStyle} />
                  </div>
                ) : (
                  'Lưu'
                )
              ) : (
                'Xóa'
              )}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ConfirmationDialog;

const spinnerStyle = {
  width: '24px',
  height: '24px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const imgStyle = {
  animation: 'spin 1s linear infinite',
};

const keyframesStyle = `
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;
