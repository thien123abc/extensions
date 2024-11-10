/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-useless-escape */
import { useHistory, useLocation } from 'react-router-dom';
import { ImgHTMLAttributes, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import api from '../api/VsocApi';
import {
  IChromeMessage,
  IVsocGetMessageApiArgs,
  IVsocRole,
  IVsocStoredConversation,
  IVsocStoredMessage,
  VsocConversationType,
} from '../api/VsocTypes';
import '../assets/css/index.scss';
import config from '../env.json';
import Tippy from '@tippyjs/react';
import IconEditDetail from '../assets/icons/icon-edit-detail.svg';
import { Box, IconButton, Modal, Tooltip } from '@mui/material';
import ConfirmationDialog from '../components/ConfirmationDialog';
import IconPlus from '../assets/icons/icon-plus.svg';
import ToastNotification from '../components/ToastNotification';
import { saveConversationAsync, stopGenarateAsync } from '../api/conversation';
import DOMPurify from 'dompurify';
import IconCopy from '../assets/icons/icon-copy.svg';
import IconPressed from '../assets/icons/icon-pressed.svg';
import IconLike from '../assets/icons/icon-like.svg';
import IconDisLike from '../assets/icons/icon-dislike.svg';
import IconLiked from '../assets/icons/icon-liked.svg';
import IconDisLiked from '../assets/icons/icon-disliked.svg';
import { feedbackMessageAsync, getMessagesApiAsync } from '../api/eventSource';
import IcondSendActive from '../assets/icons/icon-send-active.svg';
import ErrorIcon from '../assets/icons/icon-close-red.svg';
import AlertIcon from '../assets/icons/icon-alert.svg';
import PauseIcon from '../assets/icons/icon-pause.svg';
import IconSendBlur from '../assets/icons/icon-send-blur.svg';
import Prism from 'prismjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import logoImage from '../assets/images/vSOC-logo.png';
import childImage from '../assets/images/child.png';
import IconClose from '../assets/icons/icon-close.svg';
import IconDownload from '../assets/icons/icon-download.svg';

const MAX_CHAR_DISPLAY_LENGTH = 34;

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
  const [isEditDetail, setIsEditDetail] = useState<boolean>(false);
  const [toastInfo, setToastInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feebackResponse, setFeedbackResponse] = useState(false);
  const [hoverFeeback, setHoverFeedback] = useState<{ msg_id: string; display: 'flex' | 'none' }>();
  const [msgWidths, setMsgWidths] = useState<{ msg_id: string; width: number; element: HTMLDivElement }[]>([]);
  const [copiedMessage, setCopiedMessage] = useState<{ [key: string]: boolean }>({});
  const [timeoutIds, setTimeoutIds] = useState<{ [key: string]: NodeJS.Timeout }>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [stopGenerate, setStopGenerate] = useState(false);
  const [messageStatus, setMessageStatus] = useState<{ msg_id: string; msg_type: 'user' | 'bot'; task_id: string }>();

  const messageItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const feedbackRef = useRef<HTMLDivElement | null>();
  const msgRef = useRef<string>('');
  const imgRef = useRef<HTMLImageElement | null>(null);

  chrome?.runtime?.onMessage?.addListener((message: IChromeMessage) => {
    if (message && message.type === 'text_from_monitor') {
      setTextValue(message?.text ?? '');
    }
  });

  useEffect(() => {
    const listItemsBot = messageItemRefs.current.filter((item) => item?.classList.contains('item-chat'));
    const itemsInfo = listItemsBot.map((item) => ({
      msg_id: item?.getAttribute('data-msg_id') as string,
      width: item?.offsetWidth as number,
      element: item as HTMLDivElement,
    }));

    setMsgWidths(itemsInfo);
  }, [messages.length, forceRenderValue, actionMess, hoverFeeback?.msg_id]);

  useEffect(() => {
    if (hoverFeeback) {
      const el = msgWidths.find((width) => width.msg_id === hoverFeeback.msg_id);

      if (el && feedbackRef.current) {
        if (el.width <= (feedbackRef.current as HTMLDivElement)?.offsetWidth) {
          (feedbackRef.current as HTMLDivElement).style.left = '30%';
        } else {
          (feedbackRef.current as HTMLDivElement).style.right = '14px';
        }
      }
    }
  }, [hoverFeeback?.msg_id, hoverFeeback?.display, feedbackRef.current]);

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

  const handleCopy = (messageContent: string, messageId: string) => {
    navigator.clipboard
      .writeText(messageContent)
      .then(() => {
        // Nếu có timeoutId cũ, hủy bỏ nó
        if (timeoutIds[messageId]) {
          clearTimeout(timeoutIds[messageId]);
        }

        setCopiedMessage((prevState) => ({
          ...prevState,
          [messageId]: true,
        }));

        const timeoutId = setTimeout(() => {
          setCopiedMessage((prevState) => ({
            ...prevState,
            [messageId]: false,
          }));
        }, 3000);

        setTimeoutIds((prevState) => ({
          ...prevState,
          [messageId]: timeoutId,
        }));
      })
      .catch((err) => {
        console.error('Lỗi khi sao chép nội dung: ', err);
      });
  };

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

    const dataMessagesApi = (await getMessagesApiAsync({ conversation_id: id, limit: 30 }))
      .result as IVsocGetMessageApiArgs[];

    if (listMessages.result) {
      const _list: IVsocStoredMessageStore[] = [];
      for (const item of listMessages.result) {
        _list.push({
          ...item,
          isStored: true,
          message_html: await markdownToHtml(item.message),
        });
      }

      const transformedMessages = _list.map((item, index) => {
        if (index % 2 === 0)
          return {
            ...item,
            message_id: dataMessagesApi[index / 2].message_id,
            feedback: dataMessagesApi[index / 2].feedback,
          };
        return item;
      });

      transformedMessages.reverse();
      setMessages(transformedMessages);
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
          // console.log('DONE');
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
        } else {
          const message: IVsocStoredMessageStore = {
            ...data.result,
            message_html: await markdownToHtml(data.result.message),
          };

          messages.push(message);
        }
        setMessages([...messages]);
        setForceRenderValue((prev) => prev + 1);
        setMessageStatus({
          msg_id: data.result.message_id as string,
          msg_type: 'bot',
          task_id: data.result.task_id as string,
        });
        scrollToBottom();
        setActionMess(data.result.action);
        if (data.result.action === 'WAIT') {
          setTimeout(() => getListData(id), 30);
        }
      }
    } catch (error) {
      setActionMess('');
    }
  };

  // console.log('mess=>', messages);

  const createConversation = async (msg: string, type: VsocConversationType) => {
    const dataCreate = await api.conversation.createAsync({
      text: msg,
      type: type,
    });
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
      setStopGenerate(false);
      setMessageStatus({ msg_id: '', msg_type: 'user', task_id: '' });
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
      await getListData(conversation_id);
    } catch (error) {
      setActionMess('');
    }
  };

  const handleStopGenarate = async () => {
    if (messageStatus?.task_id) {
      await stopGenarateAsync(messageStatus.task_id);
      setStopGenerate(true);
    }
  };

  const handleSaveConvDetail = async (conversation_id: string, title: string) => {
    try {
      setIsSaving(true);

      await saveConversationAsync({
        conversation_id,
        title,
      });
      setIsSaving(false);
      setToastInfo(false);
      setDetailHis({ ...detailHis, title } as IVsocStoredConversation);
      setIsEditDetail(false);
    } catch (error) {
      setToastInfo(true);
      setIsSaving(false);
    }
  };

  const handleFeedback = async (rating: 'like' | 'dislike' | null, message_id: string) => {
    try {
      await feedbackMessageAsync({
        message_id,
        rating,
      });
      const feedbackMsg = messages.find((msg) => msg.message_id === message_id) as IVsocStoredMessageStore;
      if (rating === null) feedbackMsg.feedback = null;
      else feedbackMsg.feedback = { rating };
      const findFeedbackMsg = messages.findIndex((msg) => msg.message_id === message_id);
      if (findFeedbackMsg !== -1) messages.splice(findFeedbackMsg, 1, feedbackMsg);
      setMessages([...messages]);
      setFeedbackResponse(false);
      setToastInfo(false);
    } catch (error) {
      setFeedbackResponse(true);
      setToastInfo(true);
    }
  };

  // Các regex kiểm tra các tệp không hợp lệ
  const fileTypeRegex =
    /(\.(jpg|jpeg|png|webp|gif|tiff|psd|pdf|eps|avi|mp4|wmv|mkv|vob|divx|flv|h263|h264|wmv9|mpeg|3gp|webm|mp3|wma|wav|flac|ogg|pcm|aiff|alac|amr|lossless|midi|wma9|ac3|aac|mp2|docx|xlsx|pptx|txt|xls)$|^(text\/plain|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document|application\/vnd.ms-excel|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet))$/i;
  // Chặn thao tác kéo thả (drag and drop)
  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault(); // Chặn hành động mặc định của trình duyệt (không tải tệp xuống)
    const files = e.dataTransfer.files;

    if (files.length > 0) {
      const file = files[0];
      const fileType = file.type; // Lấy MIME type của tệp
      const fileName = file.name; // Lấy tên tệp

      // Kiểm tra tệp với regex đã gộp
      if (fileTypeRegex.test(fileName) || fileTypeRegex.test(fileType)) {
        setErrorMessage('Không cho phép kéo thả tệp vào ô nhập liệu' + fileName);
        setToastInfo(true);
      } else {
        setErrorMessage('');
        setToastInfo(false);
      }
    }
  };

  // Chặn thao tác paste các tệp
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedData = event.clipboardData.items;
    for (let i = 0; i < pastedData.length; i++) {
      const item = pastedData[i];
      if (item.kind === 'file') {
        const fileType = item.type; // Lấy MIME type
        const fileName = item.getAsFile()?.name || ''; // Lấy tên tệp nếu có

        // Kiểm tra phần mở rộng của tệp từ tên tệp và MIME type
        if (fileTypeRegex.test(fileName) || fileTypeRegex.test(fileType)) {
          event.preventDefault(); // Không cho phép dán tệp không hợp lệ
          setErrorMessage('Không được dán tệp có định dạng không hợp lệ.' + fileName);
          setToastInfo(true);
          return;
        }
      }
    }
    setErrorMessage('');
    setToastInfo(false);
  };

  // Chặn việc nhập các ký tự không phải là chữ cái và số
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Xử lý khi nhấn Enter
    if (e.key === 'Enter') {
      if (e.ctrlKey && textValue.trim()) {
        setTextValue(textValue + '\n'); // Ctrl+Enter xuống dòng
      } else {
        // Chặn Enter khi không phải Ctrl+Enter
        e.preventDefault();
        // Nếu actionMess là 'WAIT', không cho phép gửi tin nhắn
        if (actionMess === 'WAIT') {
          e.preventDefault();
          return false; // Chặn gửi tin nhắn
        }

        // Gửi tin nhắn và reset lại ô nhập liệu
        setTimeout(async () => {
          setTextValue('');
          await sendMessages();
        }, 200);
      }
    }
  };

  useEffect(() => {
    if (msgRef.current) {
      Prism.highlightAll();
    }
  }, [msgRef.current, actionMess]);

  // const render = {
  //   img: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
  // };
  const a = `markdown
![CRON-TRAP](https://datasec.viettelcybersecurity.com/s/6DV5vwBltw1oESG/tesst-png)
`;

  const [openImageModal, setOpenImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [isLoadedImgError, setIsLoadedImgError] = useState(false);

  const handleImageClick = (imageUrl: string) => {
    setOpenImageModal(true);
    if (!isLoadedImgError) {
      setSelectedImage(imageUrl);
    }
  };

  const handleCloseModal = () => {
    setOpenImageModal(false);
    setSelectedImage('');
  };

  const handleDownloadImage = () => {
    fetch(selectedImage, { method: 'GET', headers: {} })
      .then((response) => {
        response.arrayBuffer().then(function (buffer) {
          const url = window.URL.createObjectURL(new Blob([buffer]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'image.jpg');
          document.body.appendChild(link);
          link.click();
          link.remove();
        });
      })
      .catch((err) => {
        console.log('err', err);
      });
  };

  // Hàm xử lý khi ảnh lỗi
  const handleImageError = (e: any) => {
    e.target.src = logoImage;
    // e.target.src = childImage;
    setIsLoadedImgError(true);
    setSelectedImage(e.target.src);
  };

  console.log('kcách', imgRef?.current?.getBoundingClientRect()?.left);

  return (
    <div id="main-screen" className="container">
      {!detailHis?.id ? (
        <div id="head-panel" className="head-panel">
          <p className="title-sidepanel">Chat</p>
          {/* <img id="logoIcon" src={require('../assets/images/vSOC-logo.png')} alt="vSOC-logo" /> */}
          <img id="logoIcon" src={logoImage} alt="vSOC-logo" />
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
              <img id="menu-icon-right" src={require('../assets/images/menu-icon.png')} alt="menu-icon" />
            </button>
          </div>
        </div>
      ) : (
        <div id="head-panel-detail" className="head-panel">
          <div className="back-title">
            <Tippy content="Quay lại" interactive placement="bottom">
              <button
                onClick={() => {
                  history.push('/history');
                }}
              >
                <img id="menu-icon" src={require('../assets/images/back-icon.png')} alt="back-icon" />
              </button>
            </Tippy>
            <p>
              {' '}
              {detailHis?.title.length <= MAX_CHAR_DISPLAY_LENGTH
                ? detailHis?.title
                : detailHis?.title.slice(0, MAX_CHAR_DISPLAY_LENGTH) + '...'}
            </p>
          </div>
          <div className="detail-action-buttons">
            <Tippy content="Đổi tên" interactive>
              <IconButton size="small" sx={{ width: 40, height: 40, marginRight: '4px' }}>
                <img
                  id="edit-icon-detail"
                  src={IconEditDetail}
                  alt="edit-icon-detail"
                  style={{ width: '24px', height: '24px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditDetail(true);
                    setFeedbackResponse(false);
                    setToastInfo(false);
                  }}
                />
              </IconButton>
            </Tippy>
            <div className="right-btn-row">
              <div className="custom-tooltip" style={{ display: showTooltip ? 'flex' : 'none' }}>
                <div className="content-tooltip">
                  <p>Tạo chat mới</p>
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
                style={{ marginTop: '3px' }}
              >
                <img id="menu-icon" src={IconPlus} alt="plus-icon" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="chat-panel" data-x={forceRenderValue.toString()}>
        {messages.length > 0 ? (
          <div ref={scrollRef} id="text-chat-panel" className="text-chat-panel">
            {messages.map((item: IVsocStoredMessageStore, index) => {
              console.log('item', item.message_html);
              console.log('mark', item.message);
              const hasImage = /!\[.*\]\(.*\)/.test(item.message);

              const inputClass = item.role === 'User' ? 'user-item-chat' : 'item-chat';
              const builtinRoles: Record<string, IVsocRole> = config.builtin_roles;
              const defaultRole: IVsocRole = config.default_role;
              const colorRole = item.role in builtinRoles ? builtinRoles[item.role].color : defaultRole.color;
              const bgRole =
                item.role in builtinRoles ? builtinRoles[item.role].background_color : defaultRole.background_color;
              const imgRole = item.role in builtinRoles ? builtinRoles[item.role].avatar : defaultRole.avatar;
              // let raw_html = '';
              // let raw_html_table = '';
              // const raw_html_list = item.message_html.split('<table>');
              // console.log('raw_html_list', raw_html_list);
              // raw_html_list.forEach((itemText) => {
              //   raw_html += itemText + '<div id="scroll-view-table"><table>';
              // });
              // console.log('raw_html', raw_html);

              // const raw_html_list_tail = raw_html.split('</table>');
              // console.log('raw_html_list_tail', raw_html_list_tail);
              // raw_html_list_tail.forEach((itemText) => {
              //   raw_html_table += itemText + '</table></div>';
              // });
              // console.log('raw_html_table', raw_html_table);
              const sanitizedHtml = DOMPurify.sanitize(item.message_html);
              msgRef.current = sanitizedHtml;

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
                  <div
                    className={inputClass}
                    ref={(el: HTMLDivElement) => (messageItemRefs.current[index] = el)}
                    data-msg_id={item?.message_id}
                    onMouseEnter={() => {
                      setHoverFeedback({ msg_id: item.message_id as string, display: 'flex' });
                    }}
                    onMouseLeave={() => {
                      setHoverFeedback({ msg_id: item.message_id as string, display: 'none' });
                    }}
                  >
                    {hasImage ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ src, alt }) => (
                            <Tippy content="Xem chi tiết" interactive placement="top">
                              <img
                                src={src}
                                alt={alt}
                                style={{
                                  width: '160px',
                                  height: '160px',
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                  display: 'flex',
                                }}
                                onClick={() => handleImageClick(src as string)}
                                onError={handleImageError}
                                ref={imgRef}
                              />
                            </Tippy>
                          ),
                        }}
                      >
                        {item.message}
                      </ReactMarkdown>
                    ) : (
                      <p
                        className="item-text-chat"
                        dangerouslySetInnerHTML={{
                          __html: sanitizedHtml,
                        }}
                      ></p>
                    )}

                    {inputClass === 'item-chat' &&
                    actionMess === 'WAIT' &&
                    item.message_id === messageStatus?.msg_id ? (
                      <span className="streaming"></span>
                    ) : null}
                    {inputClass === 'item-chat' &&
                      hoverFeeback &&
                      hoverFeeback.msg_id === item.message_id &&
                      item.action === 'DONE' && (
                        <Box
                          ref={feedbackRef}
                          sx={{
                            display: hoverFeeback.display,
                            padding: '4px',
                            width: '78px',
                            height: '22px',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '4px',
                            backgroundColor: '#3D3D43',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'absolute',
                            bottom: '-22px',
                          }}
                        >
                          <Tippy
                            content={copiedMessage[item.message_id] ? 'Pressed' : 'Copy'}
                            interactive
                            placement="bottom"
                          >
                            <IconButton
                              sx={{ padding: 0 }}
                              onClick={() => handleCopy(item.message, item.message_id as string)}
                            >
                              {copiedMessage[item.message_id] ? (
                                <img src={IconPressed} alt="icon-copy" style={{ width: '24px', height: '24px' }} />
                              ) : (
                                <img src={IconCopy} alt="icon-copy" style={{ width: '24px', height: '24px' }} />
                              )}
                            </IconButton>
                          </Tippy>
                          <Tippy content="Phản hồi tốt" interactive placement="bottom" className="custom-tippy-liked">
                            <IconButton
                              sx={{ padding: 0 }}
                              onClick={() =>
                                handleFeedback(
                                  item.feedback?.rating === 'like' ? null : 'like',
                                  item.message_id as string,
                                )
                              }
                            >
                              {item.message_id === hoverFeeback.msg_id && item.feedback?.rating === 'like' ? (
                                <img src={IconLiked} alt="icon-copy" style={{ width: '24px', height: '24px' }} />
                              ) : (
                                <img src={IconLike} alt="icon-copy" style={{ width: '24px', height: '24px' }} />
                              )}
                            </IconButton>
                          </Tippy>
                          <Tippy
                            content="Phản hồi không tốt"
                            interactive
                            placement="bottom"
                            className="custom-tippy-disliked"
                          >
                            <IconButton
                              sx={{ padding: 0 }}
                              onClick={() =>
                                handleFeedback(
                                  item.feedback?.rating === 'dislike' ? null : 'dislike',
                                  item.message_id as string,
                                )
                              }
                            >
                              {item.message_id === hoverFeeback.msg_id && item.feedback?.rating === 'dislike' ? (
                                <img src={IconDisLiked} alt="icon-copy" style={{ width: '24px', height: '24px' }} />
                              ) : (
                                <img src={IconDisLike} alt="icon-copy" style={{ width: '24px', height: '24px' }} />
                              )}
                            </IconButton>
                          </Tippy>
                        </Box>
                      )}
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
        {actionMess === 'WAIT' && messageStatus?.msg_type === 'user' ? (
          <p className="typing-text">
            <span className="cursor"></span>
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
              onDrop={handleDrop}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
            />

            <Tippy content={actionMess === 'WAIT' ? 'Dừng' : 'Gửi'} interactive placement="top">
              {actionMess === 'WAIT' && messageStatus?.task_id && !stopGenerate ? (
                <button id="send-text" onClick={handleStopGenarate}>
                  <img src={PauseIcon} alt="pause-icon" />
                </button>
              ) : (
                <button
                  className={actionMess === 'WAIT' || !textValue.trim() ? 'disable-button' : ''}
                  disabled={actionMess === 'WAIT' || !textValue.trim()}
                  id="send-text"
                  onClick={sendMessages}
                >
                  {textValue.trim() && stopGenerate ? (
                    <img id="send-icon" src={IcondSendActive} alt="send-icon" />
                  ) : (
                    <img id="send-icon" src={IconSendBlur} alt="send-icon" />
                  )}
                </button>
              )}
            </Tippy>
          </div>
        </div>
      </div>
      {detailHis && isEditDetail && (
        <ConfirmationDialog
          title="Đổi tên"
          initialInputValue={detailHis.title}
          isEditingTitle
          widthBox="352px"
          heightBox="172px"
          isLoadingSave={isSaving}
          onClose={() => {
            setIsEditDetail(false);
          }}
          onClick={(arg: string) => handleSaveConvDetail(detailHis.id, arg)}
        />
      )}
      {toastInfo && (
        <ToastNotification
          height={feebackResponse ? 56 : 40}
          width={feebackResponse ? 351 : 288}
          icon={feebackResponse ? AlertIcon : ErrorIcon}
          bg={feebackResponse ? '#C95859' : '#303036'}
          open={toastInfo}
          message={
            feebackResponse
              ? 'Đánh giá phản hồi chưa được ghi nhận, vui lòng thử lại'
              : errorMessage.length
                ? 'Nội dung sai định dạng'
                : 'Đổi tên thất bại'
          }
          handleClose={() => {
            setToastInfo(false);
            setErrorMessage('');
          }}
        />
      )}

      {/* Image Modal */}
      <Modal
        open={openImageModal}
        onClose={handleCloseModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            // backgroundColor: 'white',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <img
              src={selectedImage}
              alt="Full Size"
              style={{
                width: imgRef.current ? imgRef.current.naturalWidth : 0,
                height: imgRef.current ? imgRef.current.naturalHeight : 0,
                objectFit: 'contain',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '91px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0 16px',
              }}
            >
              <IconButton onClick={handleCloseModal}>
                <img src={IconClose} alt="icon-close" />
              </IconButton>
              <IconButton onClick={handleDownloadImage}>
                <img src={IconDownload} alt="icon-download" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}

export default MainScreen;
