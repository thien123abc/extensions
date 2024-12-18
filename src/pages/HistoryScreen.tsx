import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router';
import api from '../api/VsocApi';
import { IVsocGetMessageApiArgs, IVsocStoredConversation } from '../api/VsocTypes';
import EditIcon from '../assets/icons/edit-icon.svg';
import DeleteIcon from '../assets/icons/delete-icon.svg';
import Button from '@mui/material/Button';
import { FormHelperText, Input, Typography } from '@mui/material';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { deleteConversationAsync, saveConversationAsync } from '../api/conversation';
import LoadingIcon from '../assets/icons/loading-icon.svg';
import ToastNotification from '../components/ToastNotification';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { formattedTime } from '../utils/formatTime';
import ErrorIcon from '../assets/icons/icon-close-red.svg';
import { getMessagesApiAsync } from '../api/eventSource';
import IconError from '../assets/icons/icon-alert-error.svg';

type ActionState = { type: 'EDIT'; id: string; text: string } | { type: 'DELETE'; id: string; text: string } | null;

export const MAX_CHAR_INPUT_LENGTH = 200;

function HistoryScreen() {
  const history = useHistory();
  const [conversations, setConversations] = useState<IVsocStoredConversation[]>([]);
  const [conversationTimes, setConversationTimes] = useState<{ id: string; realTime: string }[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastInfo, setToastInfo] = useState(false);

  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [actionState, setActionState] = useState<ActionState>(null);

  const [titles, setTitles] = useState<{ id: string; text: string }[]>([]);
  const [lastMessageTimes, setLastMessageTimes] = useState<{ conv_id: string; lastMsgTime: number }[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDataReadyRef = useRef(false);

  const wrapperRef = useRef(null);
  useOutsideClick(
    wrapperRef,
    () => {
      if (actionState && actionState.type === 'EDIT') {
        if (
          titles.find((item) => item.id === actionState?.id)?.text.trim() === actionState?.text.trim() ||
          titles.find((item2) => item2.id === actionState?.id)?.text.length === 0
        ) {
          const { id, text } = actionState;
          setTitles((prev) => [...prev.filter((item2) => item2.id !== id), { id, text }]);
          setActionState(null);
          setIsInputFocused(false);
        } else {
          renderDataSave(actionState.id);
        }
      }
    },
    'customSnackbar',
  );

  useEffect(() => {
    getHistoryConversation();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (lastMessageTimes.length > 0 && conversations.length === lastMessageTimes.length) {
        const cloneConvs = conversations.map((item) => {
          const matchConv = lastMessageTimes.find((time) => item.id === time.conv_id);
          return matchConv ? { ...item, time: matchConv.lastMsgTime } : item;
        });
        cloneConvs.sort((a, b) => b.time - a.time);
        setConversations(cloneConvs);
        isDataReadyRef.current = true;
      }
    }
  }, [loading, lastMessageTimes.length]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isDataReadyRef.current) {
      intervalId = setInterval(() => {
        const arr: { id: string; realTime: string }[] = [];
        lastMessageTimes.forEach((item) => {
          const element: { id: string; realTime: string } = { id: '', realTime: '' };
          element.id = item.conv_id;
          element.realTime = formattedTime({ lastUsedTime: item.lastMsgTime * 1000 });
          arr.push(element);
        });

        setConversationTimes(arr);
      }, 1);
    }
    return () => {
      clearInterval(intervalId);
    };
  }, [isDataReadyRef.current]);

  const getHistoryConversation = async () => {
    setLoading(true);
    try {
      const data = await api.conversation.listAsync();
      if (data.result) {
        data.result.forEach(async (conversation) => {
          const { conversation_id: conv_id, created_at: lastMsgTime } = (
            await getMessagesApiAsync({ conversation_id: conversation.id })
          ).result?.[0] as IVsocGetMessageApiArgs;

          setLastMessageTimes((prev) => [...prev, { conv_id, lastMsgTime }]);
        });

        setConversations(data.result);
        setTitles(data.result.map((conversation) => ({ id: conversation.id, text: conversation.title })));
      }
      setLoading(false);
      return data.result;
    } catch (error) {
      //
    } finally {
      setLoading(false);
    }
  };

  const gotoChat = () => {
    history.push('/');
  };

  const handleClickCancelEdit = (e: React.MouseEvent<HTMLButtonElement>, conversation_id: string) => {
    e.stopPropagation();
    setActionState(null);
    const currentConversation = conversations.find((item) => item.id === conversation_id);
    const currentTitle = titles.find((item) => item.id === conversation_id);
    const otherTitles = titles.filter((item) => item.id !== conversation_id);
    if (currentTitle && currentConversation) {
      currentTitle.text = currentConversation.title;
      setTitles([...otherTitles, currentTitle]);
    }
  };

  const handleClickSaveEdit = async (e: React.MouseEvent<HTMLButtonElement>, conversation_id: string) => {
    e.stopPropagation();
    renderDataSave(conversation_id);
  };
  const renderDataSave = async (conversation_id: string) => {
    try {
      setIsSaving(true);

      const data = await saveConversationAsync({
        conversation_id,
        title: titles.find((item) => item.id === conversation_id)?.text.trim() as string,
      });

      setIsSaving(false);
      setActionState(null);
      setTitles((prev) => {
        const title = prev.find((item) => item.id === data?.result?.id) as { id: string; text: string };
        title.text = data?.result?.title.trim() as string;
        return [...prev.filter((item) => item.id !== title.id), title];
      });
      setConversations((prev) => {
        const conversation = prev.find((item) => item.id === data?.result?.id) as IVsocStoredConversation;
        conversation.title = data?.result?.title as string;
        const currentConvs = [...prev.filter((item) => item.id !== conversation.id), conversation];
        currentConvs.sort((a, b) => b.time - a.time);
        return currentConvs;
      });
      setToastInfo(false);
    } catch (error) {
      setToastInfo(true);
      setIsSaving(false);
    }
  };

  const handleClickDelete = async () => {
    try {
      if (actionState && actionState.type === 'DELETE') {
        await deleteConversationAsync({ conversation_id: actionState.id });
        setConversations((prev) => [...prev.filter((item) => item.id !== actionState.id)]);
        setActionState(null);
        setToastInfo(false);
      }
    } catch (error) {
      setToastInfo(true);
    }
  };

  const [isInputFocused, setIsInputFocused] = useState(false);
  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

  return (
    <div id="history-screen" className="container">
      <div id="head-panel" className="head-panel">
        <p className="title-sidepanel">Lịch sử</p>
        <img id="logoIcon" src={require('../assets/images/vSOC-logo.png')} alt="vSOC-logo" />
        <div className="right-btn-row">
          <div className="custom-tooltip" style={{ display: showTooltip ? 'flex' : 'none' }}>
            <div className="content-tooltip">
              <p>Tạo chat mới</p>
            </div>
            <div className="after-tooltip" />
          </div>
          <button
            onClick={gotoChat}
            onMouseEnter={() => {
              setShowTooltip(true);
            }}
            onMouseLeave={() => {
              setShowTooltip(false);
            }}
          >
            <img id="menu-icon" src={require('../assets/images/plus-icon.png')} alt="plus-icon" />
          </button>
        </div>
      </div>
      <div className="body-panel">
        {!loading ? (
          conversations.length > 0 ? (
            <div className="his-chat-panel">
              <div className="chat-panel-container" ref={wrapperRef}>
                {conversations.map((item: IVsocStoredConversation) => {
                  return (
                    <div
                      className="his-chat"
                      key={item.id}
                      style={{
                        cursor: 'pointer',
                        height:
                          actionState && actionState.id === item.id && actionState.type === 'EDIT' ? '100px' : '88px',
                        backgroundColor:
                          actionState && actionState.id === item.id && actionState.type === 'EDIT' ? '#242428' : '',
                      }}
                      onClick={(e) => {
                        if (!isInputFocused) {
                          history.push('/', item);
                        }
                      }}
                    >
                      <button
                        className="item-his-view"
                        key={item.id}
                        // onClick={(e) => {
                        //   if (!isInputFocused) {
                        //     history.push('/', item);
                        //   }
                        // }}
                      >
                        {actionState && actionState.id === item.id && actionState.type === 'EDIT' ? (
                          <>
                            <Input
                              onFocus={handleInputFocus}
                              onBlur={handleInputBlur}
                              inputRef={inputRef}
                              autoFocus={actionState && actionState.id === item.id}
                              value={titles.find((item2) => item2.id === item.id)?.text}
                              onChange={(e) => {
                                let value = e.target.value;
                                // Nếu người dùng nhập dấu cách ở đầu hoặc sau dấu cách liên tiếp, xóa nó
                                if (value.startsWith(' ')) {
                                  value = value.replace(/^\s+/, ''); // Loại bỏ dấu cách ở đầu chuỗi
                                }
                                if (value.trim() !== '' && /\s{2,}/.test(value)) {
                                  value = value.replace(/\s+/g, ' '); // Thay thế mọi dấu cách liên tiếp thành 1 dấu cách duy nhất
                                }
                                if (value.length > MAX_CHAR_INPUT_LENGTH) {
                                  value = value.slice(0, MAX_CHAR_INPUT_LENGTH);
                                }
                                e.target.value = value;
                                setTitles((prev) => {
                                  if (prev.length > 0) {
                                    if (actionState && actionState.type === 'EDIT') {
                                      setActionState({ ...actionState });
                                    }
                                    const conversation = prev.find((item2) => item2.id === item.id);
                                    if (conversation) {
                                      conversation.text = e.target.value;
                                      return [...prev.filter((item2) => item2.id !== item.id), conversation];
                                    }
                                  }
                                  return [];
                                });
                              }}
                              sx={{
                                border: `1px solid ${titles.find((item2) => item2.id === item.id)?.text.length === 0 ? '#EE0033' : '#5582DF'}`,
                                borderRadius: '4px',
                                height: '28px',
                                width: '100%',
                                '&:focus': {
                                  borderColor: '#5582DF',
                                },
                                '& .MuiInputBase-input': {
                                  color: 'white',
                                  padding: '4px 12px',
                                },
                              }}
                              inputProps={{
                                style: { height: '28px' },
                              }}
                              disableUnderline
                            />
                            {titles.find((item2) => item2.id === item.id)?.text.length === 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  height: '16px',
                                  marginTop: '8px',
                                  gap: '4px',
                                }}
                              >
                                {/* <img alt="icon-error" src={IconError} /> */}
                                <FormHelperText style={{ color: '#EE0033', fontSize: '12px', marginTop: '2px' }}>
                                  Tên hội thoại không được để trống
                                </FormHelperText>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="titles-item-his-view" style={{ fontWeight: 'bold' }}>
                              {item.title}
                            </p>
                            <p>{conversationTimes.find((item2) => item2.id === item.id)?.realTime}</p>
                          </>
                        )}
                      </button>
                      <div
                        className="item-his-view-actions"
                        style={{ display: actionState && actionState.id === item.id ? 'none' : '' }}
                      >
                        <Tippy content="Chỉnh sửa" placement="top" interactive className="custom-tippy">
                          <img
                            id="edit-icon"
                            src={EditIcon}
                            alt="edit-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (actionState && actionState.type === 'EDIT') {
                                const { id, text } = actionState;
                                setTitles((prev) => [...prev.filter((item2) => item2.id !== id), { id, text }]);
                              }
                              setActionState({ id: item.id, type: 'EDIT', text: item.title });
                            }}
                          />
                        </Tippy>
                        <Tippy content="Xóa" interactive>
                          <img
                            id="delete-icon"
                            src={DeleteIcon}
                            alt="delete-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionState({ id: item.id, type: 'DELETE', text: item.title });
                            }}
                          />
                        </Tippy>
                      </div>
                      <div
                        className="action-container"
                        style={{
                          display: actionState?.type === 'EDIT' && actionState.id === item.id ? 'flex' : 'none',
                        }}
                      >
                        <div className="character-display">
                          <Typography variant="body2" color="#C9C9CF">
                            {titles.find((item2) => item2.id === item.id)?.text.length}/{MAX_CHAR_INPUT_LENGTH}
                          </Typography>
                        </div>
                        <div className="edit-confirmation">
                          <Button
                            size="small"
                            sx={{
                              backgroundColor: '#494950',
                            }}
                            onClick={(e) => handleClickCancelEdit(e, item.id)}
                          >
                            Hủy
                          </Button>
                          <Button
                            sx={{
                              backgroundColor: '#FD2F4A',
                              opacity:
                                titles.find((item) => item.id === actionState?.id)?.text.trim() ===
                                  actionState?.text.trim() ||
                                titles.find((item2) => item2.id === item.id)?.text.length === 0
                                  ? 0.7
                                  : 1,
                              '&:hover': {
                                backgroundColor: '#FD2F4A',
                                opacity: 0.8,
                              },
                            }}
                            disabled={
                              titles.find((item) => item.id === actionState?.id)?.text.trim() ===
                                actionState?.text.trim() ||
                              titles.find((item2) => item2.id === item.id)?.text.length === 0
                            }
                            onClick={(e) => handleClickSaveEdit(e, item.id)}
                          >
                            {isSaving ? (
                              <div className="spinner">
                                <img src={LoadingIcon} alt="icon-loading" className="" />
                              </div>
                            ) : (
                              'Lưu'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="no-data-view">
              <img src={require('../assets/images/no-message-icon.png')} alt="no-data"></img>
              <p>Chưa có tin nhắn</p>
              <button onClick={gotoChat}>Chat với vSOC</button>
            </div>
          )
        ) : (
          <div className="no-data-view">
            <img src={require('../assets/images/no-message-icon.png')} alt="no-data"></img>
            <p>Đang tải hội thoại</p>
          </div>
        )}
      </div>
      {toastInfo && (
        <ToastNotification
          height={40}
          width={288}
          open={toastInfo}
          message={
            actionState
              ? actionState.type === 'EDIT'
                ? 'Đổi tên thất bại'
                : actionState.type === 'DELETE'
                  ? 'Xóa hội thoại thất bại'
                  : ''
              : ''
          }
          icon={ErrorIcon}
          bg="#303036"
          handleClose={() => {
            setToastInfo(false);
            if (actionState) {
              if (inputRef.current && actionState.type === 'EDIT') {
                inputRef.current.focus();
              }
              if (actionState.type === 'DELETE') {
                setActionState(null);
              }
            }
          }}
        />
      )}
      {actionState && actionState.type === 'DELETE' && (
        <ConfirmationDialog
          title="Xóa cuộc hội thoại"
          message="Bạn có chắc chắn muốn xoá hội thoại này?"
          onClose={() => setActionState(null)}
          onClick={handleClickDelete}
          widthBox="400px"
          heightBox="180px"
        />
      )}
    </div>
  );
}

export default HistoryScreen;
