import { useHistory, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import api from '../api/VsocApi';
import {
  IChromeMessage,
  IVsocRole,
  IVsocStoredConversation,
  IVsocStoredMessage,
  VsocConversationType,
} from '../api/VsocTypes';
import '../assets/css/index.scss';
import config from '../env.json';

interface IVsocStoredMessageStore extends IVsocStoredMessage {
  isStored?: boolean;
  message_html: string;
}

function MainScreen() {
  const history = useHistory();
  const [forceRenderValue, setForceRenderValue] = useState<number>(0);
  const [messages, setMessages] = useState<IVsocStoredMessageStore[]>([]);
  const [textValue, setTextValue] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation<any>();
  const [detailHis, setDetailHis] = useState<IVsocStoredConversation | null>();
  const [actionMess, setActionMess] = useState<string>('');
  const [currentConversationID, setCurrentConversationID] = useState('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  chrome?.runtime?.onMessage?.addListener((message: IChromeMessage) => {
    if (message && message.type === 'text_from_monitor') {
      setTextValue(message?.text ?? '');
    }
  });

  useEffect(() => {
    if (location.state?.id) {
      setDetailHis(location.state);
      getListMessage(location.state.id);
      setCurrentConversationID(location.state.id);
    }
  }, []);

  marked.use({
    silent: true,
  });

  const markdownToHtml = async (markdown: string): Promise<string> => {
    if (!markdown) return '';

    const html = marked.parse(markdown);
    if (typeof html === 'string') return html.trim();

    const result = await html;
    return result.trim();
  };

  const getListMessage = async (id: string) => {
    const listMessages = await api.message.listStoredAsync({
      conversation_id: id,
      limit: 30,
    });
    console.log('listMessages ', listMessages);
    if (listMessages.result) {
      const _list: IVsocStoredMessageStore[] = [];
      for (const item of listMessages.result) {
        _list.push({
          ...item,
          isStored: true,
          message_html: await markdownToHtml(item.message),
        });
      }
      _list.reverse();
      setMessages(_list);
      scrollToBottom();
      if (listMessages.result[0]?.action === 'WAIT') {
        setActionMess('WAIT');
        setTimeout(() => {
          getListMessage(id);
        }, 1000);
      } else {
        setActionMess('');
      }
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollHeight = scrollRef.current.scrollHeight;
      const height = scrollRef.current.clientHeight;
      const maxScrollTop = scrollHeight - height;
      scrollRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  };

  const getListData = async (id: string) => {
    try {
      const data = await api.message.getNextAsync({
        conversation_id: id,
      });
      console.log('data response', data?.result);
      if (data.result) {
        if (!data.result.message && data.result.action == 'WAIT') {
          setTimeout(() => getListData(id), 1000);
          return;
        }

        if (data.result.action == 'DONE') {
          // xử lý khi bot trả lời xong
          // ...
          console.log('DONE');
        }

        await saveMessage(data.result);
        if (
          messages.length > 0 &&
          messages[messages.length - 1].type == 'text' &&
          messages[messages.length - 1].role == data.result.role
        ) {
          const raw = messages[messages.length - 1].message + data.result.message;
          messages[messages.length - 1] = {
            ...data.result,
            message: raw,
            message_html: await markdownToHtml(raw),
          };
          console.log('text convert sau=>', messages[messages.length - 1].message_html);
        } else {
          const message: IVsocStoredMessageStore = {
            ...data.result,
            message_html: await markdownToHtml(data.result.message),
          };
          console.log('text convert ban đầu=>', message.message_html);

          messages.push(message);
        }
        setForceRenderValue((prev) => prev + 1);
        scrollToBottom();
        setActionMess(data.result.action);
        if (data.result.action === 'WAIT') {
          setTimeout(() => getListData(id), 1);
        }
      }
    } catch (error) {
      setActionMess('');
    }
  };

  console.log('mess=>', messages);

  const createConversation = async (msg: string, type: VsocConversationType) => {
    console.log('Start Create Conversation with text', msg, ' and type', type);
    const dataCreate = await api.conversation.createAsync({
      text: msg,
      type: type,
    });
    console.log('dataCreate.result', dataCreate.result);
    if (dataCreate.result?.conversation_id) {
      await saveConversation(msg, dataCreate.result.conversation_id);
    }
    return dataCreate.result?.conversation_id ?? '';
  };

  const saveConversation = async (msg: string, conversation_id: string) => {
    const data = await api.conversation.storeAsync({
      conversation_id: conversation_id,
      title: msg,
    });
    console.log('save data conversation ', data);
  };

  const saveMessage = async (msg: IVsocStoredMessage) => {
    await api.message.storeAsync({
      message: msg,
    });
  };

  const sendMessages = async () => {
    try {
      if (!textValue.trim()) {
        return;
      }
      setTextValue('');
      setActionMess('WAIT');
      let conversation_id;
      let _textValue: string = '';
      const textMess = textValue.split('\n');
      textMess.forEach((item) => {
        _textValue += item + '\n\n';
      });
      const msg: IVsocStoredMessageStore = {
        conversation_id: currentConversationID,
        message: _textValue,
        message_html: await markdownToHtml(_textValue),
        time: new Date().getTime(),
        role: 'User',
        action: 'WAIT',
        type: 'break_paragraph',
      };
      messages.push(msg);
      setForceRenderValue((prev) => prev + 1);
      scrollToBottom();
      if (messages.length <= 1) {
        conversation_id = await createConversation(textValue, 'QA');
        setCurrentConversationID(conversation_id);
        msg.conversation_id = conversation_id;
        await saveMessage(msg);
        setForceRenderValue((prev) => prev + 1);
      } else {
        conversation_id = currentConversationID;
        await saveMessage(msg);
        await api.message.sendAsync({
          conversation_id: conversation_id,
          text: textValue,
        });
      }
      console.log('CONVERSATION ID: ', conversation_id);
      await getListData(conversation_id);
    } catch (error) {
      setActionMess('');
    }
  };

  return (
    <div id="main-screen" className="container">
      {!detailHis?.id ? (
        <div id="head-panel" className="head-panel">
          <p className="title-sidepanel">Chat11111</p>
          <img id="logoIcon" src={require('../assets/images/vSOC-logo.png')} alt="vSOC-logo" />
          <div className="right-btn-row">
            <div className="custom-tooltip" style={{ display: showTooltip ? 'flex' : 'none' }}>
              <div className="content-tooltip">
                <p>Lịch sử chat</p>
              </div>
              <div className="after-tooltip" />
            </div>
            <button
              onClick={() => {
                history.push('/history');
              }}
              onMouseEnter={() => {
                setShowTooltip(true);
              }}
              onMouseLeave={() => {
                setShowTooltip(false);
              }}
            >
              <img id="menu-icon" src={require('../assets/images/menu-icon.png')} alt="menu-icon" />
            </button>
          </div>
        </div>
      ) : (
        <div id="head-panel-detail" className="head-panel">
          <div className="back-title">
            <button
              onClick={() => {
                history.push('/history');
              }}
            >
              <img id="menu-icon" src={require('../assets/images/back-icon.png')} alt="back-icon" />
            </button>
            <p>{detailHis?.title}</p>
          </div>
          <div className="right-btn-row">
            <div className="custom-tooltip" style={{ display: showTooltip ? 'flex' : 'none' }}>
              <div className="content-tooltip">
                <p>Tạo chat mới nha</p>
              </div>
              <div className="after-tooltip" />
            </div>
            <button
              onClick={() => {
                setDetailHis(null);
                setMessages([]);
                setCurrentConversationID('');
                setActionMess('');
              }}
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
      )}
      <div className="chat-panel" data-x={forceRenderValue.toString()}>
        {messages.length > 0 ? (
          <div ref={scrollRef} id="text-chat-panel" className="text-chat-panel">
            {messages.map((item: IVsocStoredMessageStore) => {
              const inputClass = item.role === 'User' ? 'user-item-chat' : 'item-chat';
              const builtinRoles: Record<string, IVsocRole> = config.builtin_roles;
              const defaultRole: IVsocRole = config.default_role;
              const colorRole = item.role in builtinRoles ? builtinRoles[item.role].color : defaultRole.color;
              const bgRole =
                item.role in builtinRoles ? builtinRoles[item.role].background_color : defaultRole.background_color;
              const imgRole = item.role in builtinRoles ? builtinRoles[item.role].avatar : defaultRole.avatar;
              let raw_html = '';
              let raw_html_table = '';
              const raw_html_list = item.message_html.split('<table>');
              console.log('raw_html_list', raw_html_list);
              raw_html_list.forEach((itemText) => {
                raw_html += itemText + '<div id="scroll-view-table"><table>';
              });
              console.log('raw_html', raw_html);

              const raw_html_list_tail = raw_html.split('</table>');
              console.log('raw_html_list_tail', raw_html_list_tail);
              raw_html_list_tail.forEach((itemText) => {
                raw_html_table += itemText + '</table></div>';
              });
              console.log('raw_html_table', raw_html_table);

              return (
                <div
                  className="item-chat-view"
                  style={{ alignItems: item.role === 'User' ? 'flex-end' : 'flex-start' }}
                  key={item.conversation_id + '_' + item.time}
                >
                  {item.role === 'User' ? null : (
                    <div className="item-name-view">
                      <img
                        src={imgRole}
                        style={{
                          backgroundColor: bgRole,
                        }}
                        alt="avatar"
                      />
                      <p style={{ color: colorRole }}>{item.role || 'vSOC'}</p>
                    </div>
                  )}
                  <div className={inputClass}>
                    <p className="item-text-chat" dangerouslySetInnerHTML={{ __html: raw_html_table }}></p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div id="default-text-chat" className="default-text-chat">
            <img id="people-icon" src={require('../assets/images/people-icon.png')} alt="people-icon" />
            <p className="default-title-no-data">Xin chào! Chúng tôi là vSOC</p>
            <p className="default-no-data">
              vSOC sẽ giải đáp cho bạn về an toàn thông tin và hỗ trợ tự động phân tích cảnh báo.
            </p>
          </div>
        )}
        {actionMess === 'WAIT' ? (
          <p className="typing-text">
            typing <span className="cursor"></span>
          </p>
        ) : null}
        <div className="input-chat">
          <div className="view-chat">
            <textarea
              className="txt-area-content"
              placeholder="Nhập prompt..."
              value={textValue}
              onChange={(e) => {
                setTextValue(e.target.value);
              }}
              onKeyDown={async (e) => {
                if (e.key == 'Enter') {
                  if (e.ctrlKey && textValue.trim()) {
                    setTextValue(textValue + '\n');
                  } else {
                    if (actionMess === 'WAIT') {
                      e.preventDefault();
                      return false;
                    }
                    setTimeout(() => {
                      setTextValue('');
                    }, 200);
                    await sendMessages();
                  }
                }
              }}
            />
            <button
              className={actionMess === 'WAIT' || !textValue.trim() ? 'disable-button' : ''}
              disabled={actionMess === 'WAIT' || !textValue.trim()}
              id="send-text"
              onClick={sendMessages}
            >
              <img id="send-icon" src={require('../assets/images/send-icon.png')} alt="send-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainScreen;
