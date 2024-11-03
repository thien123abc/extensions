import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router';
import api from '../api/VsocApi';
import { IVsocStoredConversation } from '../api/VsocTypes';
import moment from 'moment';
import DeleteIcon from '../assets/icons/delete-icon.svg';
import EditIcon from '../assets/icons/edit-icons.svg';
import Button from '@mui/material/Button';
import { FormHelperText, Input, Typography } from '@mui/material';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { useOutsideClick } from '../hooks/useOutsideClick';

type ActionState = { type: 'EDIT'; id: string; text: string } | { type: 'DELETE'; id: string; text: string } | null;

const MAX_CHAR_INPUT_LENGTH = 200;
const MAX_CHAR_DISPLAY_LENGTH = 64;

function HistoryScreen() {
  const history = useHistory();
  const [conversations, setConversations] = useState<IVsocStoredConversation[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [actionState, setActionState] = useState<ActionState>(null);

  const [titles, setTitles] = useState<{ id: string; text: string }[]>([]);
  console.log('tit', titles);
  console.log('actionState', actionState);

  const wrapperRef = useRef(null);

  useOutsideClick(wrapperRef, () => {
    console.log(wrapperRef.current);
    if (actionState && actionState.type === 'EDIT') {
      const { id, text } = actionState;
      setTitles((prev) => [...prev.filter((item2) => item2.id !== id), { id, text }]);
      setActionState(null);
    }
  });

  useEffect(() => {
    if (actionState) {
      if (actionState.type === 'EDIT') {
        //
      } else if (actionState.type === 'DELETE') {
        //
      }
    } else {
      getHistoryConversation();
    }
  }, [actionState?.type]);

  const getHistoryConversation = async () => {
    setLoading(true);
    try {
      const data = await api.conversation.listAsync();
      console.log('conversations', data);
      if (data.result) {
        setConversations(data.result);
        setTitles(data.result.map((conversation) => ({ id: conversation.id, text: conversation.title })));
      }
    } catch (error) {
      console.log('error', error);
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

  const handleClickSaveEdit = (e: React.MouseEvent<HTMLButtonElement>, conversation_id: string) => {
    e.stopPropagation();
    setActionState(null);
  };

  return (
    <div id="history-screen" className="container">
      <div id="head-panel" className="head-panel">
        <p className="titles-sidepanel">Lịch sử</p>
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
        {!loading &&
          (conversations.length > 0 ? (
            <div className="his-chat-panel">
              <div className="chat-panel-container" ref={wrapperRef}>
                {conversations.map((item: IVsocStoredConversation) => {
                  return (
                    <div className="his-chat" key={item.id}>
                      <button
                        className="item-his-view"
                        key={item.id}
                        onClick={() => {
                          history.push('/', item);
                        }}
                      >
                        {actionState && actionState.id === item.id && actionState.type === 'EDIT' ? (
                          <>
                            <Input
                              autoFocus={actionState && actionState.id === item.id}
                              value={titles.find((item2) => item2.id === item.id)?.text}
                              onChange={(e) => {
                                if (e.target.value.length > MAX_CHAR_INPUT_LENGTH) return;
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
                                border: '1px solid #5582DF',
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
                              onClick={(e) => e.stopPropagation()}
                            />
                            {titles.find((item2) => item2.id === item.id)?.text.length === 0 && (
                              <FormHelperText style={{ color: 'red', fontSize: '12px' }}>
                                Tên hội thoại không được để trống
                              </FormHelperText>
                            )}
                          </>
                        ) : (
                          <p className="titles-item-his-view">
                            {item.title.length <= MAX_CHAR_DISPLAY_LENGTH ? item.title : item.title + '...'}
                          </p>
                        )}
                        <p>{moment(new Date(item.time)).format('HH:mm, DD/MM/YYYY')}</p>
                      </button>
                      <div
                        className="item-his-view-actions"
                        style={{ display: actionState && actionState.id === item.id ? 'none' : '' }}
                      >
                        <Tippy content="Chỉnh sửa" interactive>
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
                          <Typography variant="body2" color="HighlightText">
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
                            }}
                            disabled={
                              titles.find((item) => item.id === actionState?.id)?.text.trim() ===
                                actionState?.text.trim() ||
                              titles.find((item2) => item2.id === item.id)?.text.length === 0
                            }
                            onClick={(e) => handleClickSaveEdit(e, item.id)}
                          >
                            Lưu
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
          ))}
      </div>
    </div>
  );
}

export default HistoryScreen;
