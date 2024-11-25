/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-useless-escape */
import { useHistory, useLocation } from 'react-router-dom';
import { useContext, useEffect, useRef, useState } from 'react';
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
import { feedbackMessageAsync, getMessagesApiAsync, stopNextMessageAsync } from '../api/eventSource';
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
import { useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { useDispatch } from 'react-redux';
import IconDownGray from '../assets/icons/icon-down-gray.svg';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { IconStreaming, regexCode, regexImage, regexLink, regexMarkdown, regexMath } from '../utils/constantRegex';
import content from 'react-mathjax';

interface IVsocStoredMessageStore extends IVsocStoredMessage {
  isStored?: boolean;
  message_html: string;
}

interface ImgStatus {
  [key: string]: 'loaded' | 'error';
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
  const [leftOffset, setLeftOffset] = useState({ width: '0px', heigth: '0px' });

  const isStopAnswerRef = useRef(false);
  const messageItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const feedbackRef = useRef<HTMLDivElement | null>();
  const msgRef = useRef<string>('');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pRef = useRef<HTMLParagraphElement | null>(null);
  const parentMsgIdRef = useRef<string | null>(null);

  const isBotRunStatusRedux = useSelector((state: RootState) => state.botStatus.isBotRunStatus);
  const isChatBlockCode = useSelector((state: RootState) => state.botStatus.isChatBlockCode);
  const dispatch: AppDispatch = useDispatch();

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

  const handleCopy = (messageId: string, index: number) => {
    const messageContent = copyContentRef.current.find((item) => item.position === index)?.content as string;

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
      const filterListMsg = listMessages.result.filter((item) => !(item.message === ''));
      const _list: IVsocStoredMessageStore[] = [];
      for (const item of filterListMsg) {
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
            message_id: dataMessagesApi[index / 2]?.message_id,
            feedback: dataMessagesApi[index / 2]?.feedback,
          };
        return item;
      });

      transformedMessages.reverse();
      if (dataMessagesApi.length) {
        parentMsgIdRef.current = dataMessagesApi[0]?.message_id;
      }

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
    if (!isStopAnswerRef.current) {
      try {
        const data = await api.message.getNextAsync({
          conversation_id: id,
        });

        if (data.result) {
          parentMsgIdRef.current = data.result.message_id as string;
          if (!data.result.message && data.result.action == 'WAIT') {
            setTimeout(() => getListData(id), 1000);
            return;
          }

          if (data.result.action == 'DONE') {
            // xử lý khi bot trả lời xong
            // ...
            setStopGenerate(true);
            isStopAnswerRef.current = false;
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

          if (data.result.action === 'WAIT' && !isStopAnswerRef.current) {
            setTimeout(() => getListData(id), 30);
          }
        }
      } catch (error) {
        setActionMess('');
      }
    } else {
      const latestMsg: IVsocStoredMessageStore = {
        action: 'DONE',
        conversation_id: id,
        feedback: null,
        isStored: true,
        message: '',
        message_html: '',
        role: 'Customer Support',
        type: 'break_paragraph',
        time: new Date().getTime(),
        // message_id: JSON.parse(localStorage.getItem('lastestMsgId') || ''),
      };
      await saveMessage(latestMsg);
    }
  };

  const createConversation = async (msg: string, type: VsocConversationType, parentMsgId: string | null) => {
    const dataCreate = await api.conversation.createAsync({
      text: msg,
      type: type,
      parentMsgId,
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
      isStopAnswerRef.current = false;
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
        conversation_id = await createConversation(textValue, 'QA', null);
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
          parentMsgId: parentMsgIdRef.current,
        });
      }
      await getListData(conversation_id);
    } catch (error) {
      setActionMess('');
    }
  };

  const handleStopGenarate = async () => {
    isStopAnswerRef.current = true;
    setActionMess('DONE');
    messages[messages.length - 1].action = 'DONE';

    await stopNextMessageAsync({ conversation_id: currentConversationID });
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
        title: title.trim(),
      });
      setIsSaving(false);
      setToastInfo(false);
      setDetailHis({ ...detailHis, title: title.trim() } as IVsocStoredConversation);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // const mirror = document.querySelector('.container__mirror') as HTMLDivElement;
    const area = document.querySelector('.container__cursor') as HTMLSpanElement;
    // Xử lý khi nhấn Enter
    if (e.key === 'Enter') {
      if (e.ctrlKey && textValue.trim()) {
        setTextValue(textValue + '\n');
      } else {
        e.preventDefault();
        if (actionMess === 'WAIT') {
          e.preventDefault();
          return false;
        }
        if (area) {
          area.style.left = '0px';
          area.style.top = '0px';
        }
        // if (mirror) {
        //   mirror.style.left = '10px';
        //   mirror.style.top = '0px';
        // }
        sendMessages();
      }
    }
  };
  const handleBlur = () => {
    console.log('blur');

    const area = document.querySelector('.container__cursor') as HTMLSpanElement;
    if (area) area.style.display = 'none';
    const mirror = document.querySelector('.container__mirror') as HTMLDivElement;
    if (mirror) mirror.style.display = 'none';
  };
  const handleFocus = () => {
    console.log('focus');

    const area = document.querySelector('.container__cursor') as HTMLSpanElement;
    if (area) area.style.display = 'block';
    const mirror = document.querySelector('.container__mirror') as HTMLDivElement;
    if (mirror) mirror.style.display = 'block';
  };

  useEffect(() => {
    if (msgRef.current) {
      Prism.highlightAll();
    }
  }, [msgRef.current, actionMess]);

  const [openImageModal, setOpenImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [imgStatus, setImgStatus] = useState<ImgStatus>({});

  const handleImageClick = (imageUrl: string) => {
    setOpenImageModal(true);
    setSelectedImage(imageUrl);
  };

  const handleCloseModal = () => {
    setOpenImageModal(false);
    setSelectedImage('');
  };

  const handleDownloadImage = (src?: string) => {
    fetch(src ? src : selectedImage, { method: 'GET', headers: {} })
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
        //
      });
  };

  const handleImageError = (src: string) => {
    setImgStatus((prevState) => ({
      ...prevState,
      [src]: 'error',
    }));
  };

  //lưu ý xóa display:block ở file main_screen.scss của table
   useEffect(() => {
    const viewportWidth = window.innerWidth;
    const tables = document.querySelectorAll<HTMLTableElement>('.item-chat table');

    tables.forEach((table) => {
      if (table) {
        if (viewportWidth <= 450) {
          table.style.display = 'block';
        } else {
          table.style.removeProperty('display');
        }
      }
    });
  }, [msgRef.current, actionMess, forceRenderValue]);

  
  const calculateLeftOffset = () => {
 const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tables = document.querySelectorAll<HTMLTableElement>('.item-chat table');

    tables.forEach((table) => {
      if (table) {
        if (viewportWidth <= 450) {
          table.style.display = 'block';
        } else {
          table.style.removeProperty('display');
        }
      }
    });

    if (imgRef.current) {
      const imgWidth = imgRef.current.naturalWidth;
      const imgHeight = imgRef.current.naturalHeight;
      // const offsetWidth = (viewportWidth - imgWidth) / 2;
      // const offsetHeight = (viewportHeight - imgHeight) / 2;
      // setLeftOffset({ range: Math.ceil(Math.abs(offsetWidth)), isBigger: offsetHeight >= 182 ? false : true });
      if (imgWidth > viewportWidth) {
        setLeftOffset((prev) => ({ ...prev, width: '100%' }));
      } else setLeftOffset((prev) => ({ ...prev, width: `${imgWidth}px` }));
      if (imgHeight > viewportHeight) {
        setLeftOffset((prev) => ({ ...prev, heigth: '100%' }));
      } else {
        setLeftOffset((prev) => ({ ...prev, heigth: `${imgHeight}px` }));
      }
    }
    if (detailHis && pRef.current) {
      const pWidth = pRef.current.offsetWidth;
      if (pWidth > viewportWidth) {
        pRef.current.style.whiteSpace = 'nowrap';
        pRef.current.style.overflow = 'hidden';
        pRef.current.style.textOverflow = 'ellipsis';
      }
    }
  };

  useEffect(() => {
    calculateLeftOffset();
    window.addEventListener('resize', calculateLeftOffset);
    return () => {
      window.removeEventListener('resize', calculateLeftOffset);
    };
  }, [selectedImage]);

  useEffect(() => {
    const streamingElementsUser = document.querySelectorAll('.user-item-chat .streaming');
    const streamingElementsBot = document.querySelectorAll('.item-text-chat .streaming');
    streamingElementsUser.forEach((el) => el.remove());
    streamingElementsBot.forEach((el, index) => {
      if (actionMess === 'WAIT') {
        index !== streamingElementsBot.length - 1 && el.remove();
      } else {
        el.remove();
      }
    });
  }, [msgRef.current, actionMess, forceRenderValue]);

  const isCodeBlockRef = useRef(false);
  useEffect(() => {
    const preElements = document.querySelectorAll(
      '.item-chat pre[class*="language"]:not([class*="language-markdown"])',
    ) as NodeListOf<HTMLElement>;

    if (actionMess !== 'WAIT') {
      if (preElements.length) {
        preElements.forEach((pre: HTMLElement) => {
          // Kiểm tra nếu nút đã tồn tại thì không tạo thêm
          if (pre.querySelector('button')) return;

          // Tạo nút button
          const copyButton = document.createElement('button');
          copyButton.innerText = 'Copy';
          copyButton.style.position = 'absolute';
          copyButton.style.top = '10px';
          copyButton.style.right = '12px';
          copyButton.style.width = 'fit-content';
          copyButton.style.height = '32px';
          copyButton.style.backgroundColor = '#494950';
          copyButton.style.color = '#E5E5E7';
          copyButton.style.fontWeight = '500';
          copyButton.style.fontSize = '14px';
          copyButton.style.border = 'none';
          copyButton.style.borderRadius = '4px';
          copyButton.style.cursor = 'pointer';
          copyButton.style.zIndex = '999';

          // Thêm sự kiện click cho nút Copy
          copyButton.addEventListener('click', () => {
            // Lấy nội dung của thẻ <code> bên trong <pre>
            const codeElement = pre.querySelector('code');
            if (codeElement) {
              const codeContent = codeElement.innerText;
              // Sao chép nội dung vào clipboard
              navigator.clipboard
                .writeText(codeContent)
                .then(() => {
                  // Khi copy thành công
                  copyButton.innerText = 'Copied';
                  copyButton.style.cursor = 'default';
                  copyButton.disabled = true; // Vô hiệu hóa nút

                  // Sau 1 giây, khôi phục nút về trạng thái ban đầu
                  setTimeout(() => {
                    copyButton.innerText = 'Copy';
                    copyButton.style.cursor = 'pointer';
                    copyButton.disabled = false; // Bật lại nút
                  }, 1000);
                })
                .catch((err) => {
                  console.error('Failed to copy text: ', err);
                });
            }
          });

          // Thêm nút vào bên trong thẻ <pre>
          pre.appendChild(copyButton);
        });
      }
    }
  }, [isCodeBlockRef.current, actionMess, msgRef.current, forceRenderValue]);

  const parseText = (text: string) => {
    // Thay thế tất cả dấu '-' thành chuỗi rỗng
    text = text.replace(/-/g, '');

    const regex = /\\(\(|\[)([\s\S]*?)\\(\)|\]|\n)/g;

    let lastIndex = 0;
    const parts: { type: string; content: string }[] = [];

    let match;
    while ((match = regex.exec(text)) !== null) {
      // Thêm phần HTML trước công thức
      if (match.index > lastIndex) {
        parts.push({ type: 'html', content: text.slice(lastIndex, match.index) });
      }
      // Thêm công thức toán học
      parts.push({ type: 'latex', content: match[0] });
      lastIndex = regex.lastIndex;
    }

    // Thêm phần còn lại của HTML nếu có
    if (lastIndex < text.length) {
      parts.push({ type: 'html', content: text.slice(lastIndex) });
    }

    return parts;
  };

  const copyContentRef = useRef<{ position: number; content: string }[]>([]);

  useEffect(() => {
    copyContentRef.current = [];
    const contents = document.querySelectorAll('.item-chat');
    contents.forEach((el, index) => {
      const parsedContent = (el.textContent as string).replace(/\[\s?[x ]\s?\]/g, '').replace(/copy/gi, '');

      copyContentRef.current.push({ position: 2 * index + 1, content: parsedContent });
    });
  }, [msgRef.current, forceRenderValue, actionMess]);

  // useEffect(() => {
  //   const containerEle = document.getElementById('container');
  //   const textarea = document.getElementById('textarea') as HTMLTextAreaElement;
  //   if (containerEle && textarea) {
  //     const mirroredEle = document.createElement('div');
  //     mirroredEle.textContent = textarea.value;
  //     mirroredEle.classList.add('container__mirror');
  //     containerEle.prepend(mirroredEle);

  //     const textareaStyles = window.getComputedStyle(textarea);
  //     [
  //       'border',
  //       'boxSizing',
  //       'fontFamily',
  //       'fontSize',
  //       'fontWeight',
  //       'letterSpacing',
  //       'lineHeight',
  //       'padding',
  //       'textDecoration',
  //       'textIndent',
  //       'textTransform',
  //       'whiteSpace',
  //       'wordSpacing',
  //       'wordWrap',
  //     ].forEach((property: any) => {
  //       mirroredEle.style[property] = textareaStyles[property];
  //     });
  //     mirroredEle.style.borderColor = 'transparent';

  //     const parseValue = (v: any) => (v.endsWith('px') ? parseInt(v.slice(0, -2), 10) : 0);
  //     const borderWidth = parseValue(textareaStyles.borderWidth);

  //     const ro = new ResizeObserver(() => {
  //       mirroredEle.style.width = `${textarea.clientWidth + 2 * borderWidth}px`;
  //       mirroredEle.style.height = `${textarea.clientHeight + 2 * borderWidth}px`;
  //     });
  //     ro.observe(textarea);

  //     const handleSelectionChange = () => {
  //       if (document.activeElement !== textarea) {
  //         return;
  //       }
  //       const cursorPos = textarea.selectionStart;
  //       const textBeforeCursor = textarea.value.substring(0, cursorPos);
  //       const textAfterCursor = textarea.value.substring(cursorPos);

  //       const pre = document.createTextNode(textBeforeCursor);
  //       const post = document.createTextNode(textAfterCursor);
  //       const caretEle = document.createElement('span');
  //       caretEle.classList.add('container__cursor');
  //       caretEle.innerHTML = '&nbsp;';

  //       mirroredEle.innerHTML = '';
  //       mirroredEle.append(pre, caretEle, post);

  //       // Đồng bộ trạng thái cuộn
  //       mirroredEle.scrollTop = textarea.scrollTop;
  //     };
  //     textarea.addEventListener('scroll', () => {
  //       mirroredEle.scrollTop = textarea.scrollTop;
  //       handleSelectionChange();
  //     });
  //     document.addEventListener('selectionchange', handleSelectionChange);
  //     document.addEventListener('input', handleSelectionChange);
  //     document.addEventListener(
  //       'focus',
  //       (event) => {
  //         if (event.target === textarea) {
  //           mirroredEle.style.visibility = 'visible';
  //           setTimeout(() => {
  //             handleSelectionChange();
  //           }, 0);
  //         }
  //       },
  //       true,
  //     ); // Sử dụng pha capturing

  //     document.addEventListener(
  //       'blur',
  //       (event) => {
  //         if (event.target === textarea) {
  //           mirroredEle.scrollTop = textarea.scrollTop;
  //           // Kích hoạt sự kiện scroll bằng tay để đảm bảo đồng bộ
  //           const scrollEvent = new Event('scroll');
  //           textarea.dispatchEvent(scrollEvent);
  //           mirroredEle.style.visibility = 'hidden';
  //         }
  //       },
  //       true,
  //     );

  //     return () => {
  //       document.removeEventListener('selectionchange', handleSelectionChange);
  //       document.removeEventListener('input', handleSelectionChange);
  //       document.removeEventListener('focus', handleSelectionChange);
  //       document.removeEventListener('blur', handleSelectionChange);
  //     };
  //   }
  // }, []);


   useEffect(() => {
    const containerEle = document.getElementById('container');
    const textarea = document.getElementById('textarea') as HTMLTextAreaElement;
    if (containerEle && textarea) {
      const mirroredEle = document.createElement('div');
      mirroredEle.textContent = textarea.value;
      mirroredEle.classList.add('container__mirror');
      containerEle.prepend(mirroredEle);

      // Gắn sự kiện mousedown để ngăn mất focus khi click vào mirroredEle
      mirroredEle.addEventListener('mousedown', (event) => {
        event.preventDefault(); // Ngăn sự kiện focus bị mất khi click vào custom caret
      });

      const textareaStyles = window.getComputedStyle(textarea);
      [
        'border',
        'boxSizing',
        'fontFamily',
        'fontSize',
        'fontWeight',
        'letterSpacing',
        'lineHeight',
        'padding',
        'textDecoration',
        'textIndent',
        'textTransform',
        'whiteSpace',
        'wordSpacing',
        'wordWrap',
      ].forEach((property: any) => {
        mirroredEle.style[property] = textareaStyles[property];
      });
      mirroredEle.style.borderColor = 'transparent';

      const parseValue = (v: any) => (v.endsWith('px') ? parseInt(v.slice(0, -2), 10) : 0);
      const borderWidth = parseValue(textareaStyles.borderWidth);

      const ro = new ResizeObserver(() => {
        mirroredEle.style.width = `${textarea.clientWidth + 2 * borderWidth}px`;
        mirroredEle.style.height = `${textarea.clientHeight + 2 * borderWidth}px`;
      });
      ro.observe(textarea);

      const handleSelectionChange = () => {
        if (document.activeElement !== textarea) {
          return;
        }

        // Lấy vị trí con trỏ
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.substring(0, cursorPos);
        const textAfterCursor = textarea.value.substring(cursorPos);

        // Chia văn bản thành các dòng
        const linesBeforeCursor = textBeforeCursor.split('\n');
        const linesAfterCursor = textAfterCursor.split('\n');

        const caretLineIndex = linesBeforeCursor.length - 1; // Dòng hiện tại của caret
        const caretOffset = linesBeforeCursor[caretLineIndex].length; // Vị trí trong dòng

        // Reset nội dung của mirroredEle
        mirroredEle.innerHTML = '';

        // Xử lý từng dòng trong textarea
        const allLines = textarea.value.split('\n');
        allLines.forEach((line, index) => {
          const lineEle = document.createElement('div');
          lineEle.classList.add('container__line');
          lineEle.textContent = line || '\u200B'; // Sử dụng ký tự zero-width space cho dòng trống
          mirroredEle.appendChild(lineEle);

          if (index === caretLineIndex) {
            // Thêm caret vào dòng hiện tại
            const caretEle = document.createElement('span');
            caretEle.classList.add('container__cursor');
            caretEle.innerHTML = '&nbsp;';

            // Chia dòng tại vị trí caret
            const preText = document.createTextNode(line.substring(0, caretOffset));
            const postText = document.createTextNode(line.substring(caretOffset));

            lineEle.innerHTML = ''; // Xóa nội dung cũ để thêm caret
            lineEle.appendChild(preText);
            lineEle.appendChild(caretEle);
            lineEle.appendChild(postText);
          }
        });

        // Đồng bộ cuộn
        mirroredEle.scrollTop = textarea.scrollTop;
      };

      // Đồng bộ cuộn khi scroll xảy ra
      textarea.addEventListener('scroll', () => {
        handleSelectionChange();
      });
      document.addEventListener('selectionchange', handleSelectionChange);
      document.addEventListener('input', handleSelectionChange);
      document.addEventListener(
        'focus',
        (event) => {
          if (event.target === textarea) {
            mirroredEle.style.visibility = 'visible';

            setTimeout(() => {
              handleSelectionChange();
            }, 0);
          }
        },
        true,
      );

      document.addEventListener(
        'blur',
        (event) => {
          if (
            event.target === textarea &&
            (!event.relatedTarget || !mirroredEle.contains(event.relatedTarget as Node))
          ) {
            mirroredEle.scrollTop = textarea.scrollTop;
            // Kích hoạt sự kiện scroll bằng tay để đảm bảo đồng bộ
            const scrollEvent = new Event('scroll');
            textarea.dispatchEvent(scrollEvent);
            mirroredEle.style.visibility = 'hidden';
          }
        },
        true,
      );

      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        document.removeEventListener('input', handleSelectionChange);
        document.removeEventListener('focus', handleSelectionChange);
        document.removeEventListener('blur', handleSelectionChange);
      };
    }
  }, []);


  useEffect(() => {
    if (actionMess !== 'WAIT') {
      const preTags = document.querySelectorAll('.item-chat pre');

      preTags.forEach((pre) => {
        if (pre.parentNode) {
          const wrapperDiv = document.createElement('div');
          wrapperDiv.classList.add('code-block');
          pre.parentNode.insertBefore(wrapperDiv, pre);
          wrapperDiv.appendChild(pre);
        }
      });
    }
  }, [msgRef.current, forceRenderValue, actionMess]);
  useEffect(() => {
    const preElements = document.querySelectorAll('.user-item-chat > .item-text-chat > pre');

    preElements.forEach((pre) => {
      pre.removeAttribute('class');

      const codeElement = pre.querySelector('code');
      if (codeElement) {
        codeElement.removeAttribute('class');
      }
    });
  }, [msgRef.current, forceRenderValue, actionMess]);

  return (
    <div id="main-screen" className="container">
      {!detailHis?.id ? (
        <div id="head-panel" className="head-panel">
          <p className="title-sidepanel">Chat</p>
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
                  handleStopGenarate();
                }}
              >
                <img id="menu-icon" src={require('../assets/images/back-icon.png')} alt="back-icon" />
              </button>
            </Tippy>
            <p ref={pRef}>{detailHis.title}</p>
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
              const hasLink = regexLink.test(item.message);
              const hasCode = regexCode.test(item.message_html);
              const hasImage = regexImage.test(item.message);
              isCodeBlockRef.current = hasCode;
              const hasMarkdown = regexMarkdown.test(item.message_html);
              const hasMath = regexMath.test(item.message);

              const parsed = parseText(item.message);

              let listLatex = [];
              let arr = [];
              if (hasMath) {
                listLatex = parsed
                  .map((item) => {
                    if (item.type === 'html') {
                      return { ...item, content: marked.parse(item.content) };
                    } else if (item.type === 'latex') {
                      return {
                        ...item,
                        content: item.content
                          .replace(/\\\(/g, '\\\\')
                          .replace(/\\\)/g, '\\\\')
                          .replace(/\\\[/g, '\\\\')
                          .replace(/\\\]/g, '\\\\'),
                      };
                    }
                    return null;
                  })
                  .map((item2: any) => ({ ...item2, content: item2.content as string }));
                if (listLatex.length)
                  listLatex[listLatex.length - 1].content = ' ' + listLatex[listLatex.length - 1]?.content;
                arr = listLatex.map((item) => {
                  if (item.type === 'html') {
                    if (item.content === '') {
                      return { ...item, content: ' ' };
                    } else
                      return {
                        ...item,
                        content:
                          ' ' +
                          item.content
                            .replace(/<p>/g, '<span>')
                            .replace(/<\/p>/g, '</span>')
                            .replace(/\./g, ' ')
                            .replace(/([A-Z])/g, ' $1'),
                      };
                  } else if (item.type === 'latex' && item.content === '\\\\\\a, b]\\\\') {
                    return { ...item, content: '\\\\ [a, b] \\\\' };
                  }
                  return { ...item, content: item.content };
                });
              }
              // console.log('arr', arr);
              // console.log('latex', listLatex);
              // console.log('item', item);

              const renderer = new marked.Renderer();
              if (hasLink) {
                renderer.link = (href, title, text) => {
                  return `<a href="${href}" target="_blank" rel="noreferrer" style="color:#7EBBFC;">${text}</a>`;
                };
              }
              const sanitizedHtmlLink = DOMPurify.sanitize(marked(item.message + IconStreaming, { renderer }), {
                ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'], // Cho phép các thuộc tính này
              });

              const inputClass = item.role === 'User' ? 'user-item-chat' : 'item-chat';
              const builtinRoles: Record<string, IVsocRole> = config.builtin_roles;
              const defaultRole: IVsocRole = config.default_role;
              const colorRole = item.role in builtinRoles ? builtinRoles[item.role].color : defaultRole.color;
              const bgRole =
                item.role in builtinRoles ? builtinRoles[item.role].background_color : defaultRole.background_color;
              const imgRole = item.role in builtinRoles ? builtinRoles[item.role].avatar : defaultRole.avatar;

              const sanitizedHtml = DOMPurify.sanitize(item.message_html + IconStreaming);

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
                    {hasImage && (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          img: ({ src, alt }: React.ImgHTMLAttributes<HTMLImageElement>) =>
                            imgStatus[src as string] !== 'error' ? (
                              <div className="img-download">
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
                                  onError={() => handleImageError(src as string)}
                                  ref={imgRef}
                                />
                                <img
                                  src={IconDownGray}
                                  alt="icon-down"
                                  style={{ position: 'absolute', right: '10px', top: '10px' }}
                                  onClick={() => handleDownloadImage(src)}
                                />
                              </div>
                            ) : null,
                        }}
                      >
                        {item.message}
                      </ReactMarkdown>
                    )}

                    {hasLink && hasCode && (
                      <p
                        className="item-text-chat"
                        dangerouslySetInnerHTML={{
                          __html: sanitizedHtmlLink as any,
                        }}
                      ></p>
                    )}
                    {hasLink && !hasCode && (
                      <p
                        className="item-text-chat"
                        dangerouslySetInnerHTML={{
                          __html: sanitizedHtmlLink as any,
                        }}
                      ></p>
                    )}

                    {hasCode &&
                      hasMath &&
                      arr.map((latex) => {
                        if (latex.type == 'html')
                          return (
                            <p
                              className="item-text-chat"
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(latex.content + IconStreaming),
                              }}
                            ></p>
                          );
                        else return <InlineMath math={latex.content} />;
                      })}
                    {(hasCode || hasMarkdown) && !hasLink && !hasMath ? (
                      <p
                        className="item-text-chat"
                        dangerouslySetInnerHTML={{
                          __html: sanitizedHtml,
                        }}
                      ></p>
                    ) : null}

                    {hasMath &&
                      !hasCode &&
                      arr.map((latex) => {
                        if (latex.type == 'html')
                          return (
                            <p
                              className="item-text-chat"
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(latex.content + IconStreaming),
                              }}
                            ></p>
                          );
                        else return <InlineMath math={latex.content} />;
                      })}

                    {!hasLink && !hasImage && !hasCode && !hasMath && !hasMarkdown ? (
                      item.role === 'User' ? (
                        <p className="item-text-chat">{item.message}</p>
                      ) : (
                        <p
                          className="item-text-chat"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(marked(item.message + IconStreaming) as any),
                          }}
                        ></p>
                      )
                    ) : null}

                    {inputClass === 'item-chat' &&
                      hoverFeeback &&
                      hoverFeeback.msg_id === item.message_id &&
                      ((actionMess === 'WAIT' && item.action === 'DONE') || actionMess !== 'WAIT') && (
                        <Box
                          ref={feedbackRef}
                          sx={{
                            display: hoverFeeback.display,
                            padding: '4px',
                            width: '88px',
                            height: '32px',
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
                            content={copiedMessage[item.message_id as string] ? 'Copied' : 'Copy'}
                            interactive
                            placement="bottom"
                          >
                            <IconButton
                              sx={{ padding: 0 }}
                              onClick={() => handleCopy(item.message_id as string, index)}
                            >
                              {copiedMessage[item.message_id as string] ? (
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
          <div className="container" id="container">
            <textarea
              id="textarea"
              className="container__textarea"
              placeholder="Nhập prompt..."
              value={textValue}
              onChange={(e) => {
                setTextValue(e.target.value);
              }}
              onDrop={handleDrop}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              // onBlur={handleBlur}
              onFocus={handleFocus}
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
                  {textValue.trim().length > 0 && stopGenerate ? (
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
          widthBox="400px"
          heightBox="204px"
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
          width={feebackResponse ? 351 : 375}
          icon={feebackResponse ? AlertIcon : ErrorIcon}
          bg={feebackResponse ? '#C95859' : '#303036'}
          open={toastInfo}
          message={
            feebackResponse
              ? 'Đánh giá phản hồi chưa được ghi nhận, vui lòng thử lại'
              : errorMessage.length
                ? 'Hệ thống hiện tại chưa hỗ trợ định dạng này'
                : 'Đổi tên thất bại'
          }
          handleClose={() => {
            setToastInfo(false);
            setErrorMessage('');
          }}
        />
      )}

      {selectedImage && (
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
                  width: `${leftOffset.width}`,
                  height: `${leftOffset.heigth}`,
                  objectFit: 'contain',
                  position: 'absolute',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '91px',
                  left:
                    window.innerWidth > (imgRef.current?.naturalWidth || 0)
                      ? Math.abs(window.innerWidth - (imgRef.current?.naturalWidth || 0)) / 2
                      : 0,
                  right:
                    window.innerWidth > (imgRef.current?.naturalWidth || 0)
                      ? Math.abs(window.innerWidth - (imgRef.current?.naturalWidth || 0)) / 2
                      : 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                }}
              >
                <IconButton onClick={handleCloseModal} style={{ background: '#494950', height: '40px', width: '40px' }}>
                  <img src={IconClose} alt="icon-close" />
                </IconButton>
                <IconButton
                  onClick={() => handleDownloadImage()}
                  style={{ background: '#494950', height: '40px', width: '40px' }}
                >
                  <img src={IconDownload} alt="icon-download" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Modal>
      )}
    </div>
  );
}

export default MainScreen;
