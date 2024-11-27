/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-useless-escape */
import { useHistory, useLocation } from 'react-router-dom';
import React, { useContext, useEffect, useRef, useState } from 'react';
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
import IconClose from '../assets/icons/icon-close.svg';
import IconDownload from '../assets/icons/icon-download.svg';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import MarkdownIt from 'markdown-it';
import markdownItFootnote from 'markdown-it-footnote';
import showdown from 'showdown';
import showdownFootnotes from 'showdown-footnotes';
import MyComponent from '../components/MarkdownWithMath';

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
  const [messageStatus, setMessageStatus] = useState<{ msg_id: string; msg_type: 'user' | 'bot'; task_id: string }>(
    () => {
      const local = JSON.parse(localStorage.getItem('status_bot') || '[]');
      const isGenerateAnswerLocal = JSON.parse(localStorage.getItem('answer_bot') || '""');
      if (isGenerateAnswerLocal === 'no_answer' && local[0] === 'sending_question' && local[1] === 'exit_while_sending')
        return { msg_id: '', msg_type: 'user', task_id: '' };
      return { msg_id: '', msg_type: 'bot', task_id: '' };
    },
  );
  const [leftOffset, setLeftOffset] = useState({ width: '0px', heigth: '0px' });

  const isStopAnswerRef = useRef(false);
  const messageItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const feedbackRef = useRef<HTMLDivElement | null>();
  const msgRef = useRef<string>('');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pRef = useRef<HTMLParagraphElement | null>(null);

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
    // if (location.state?.id) {
    setDetailHis(location.state);
    getListMessage('1');
    setCurrentConversationID('1');
    // }
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
    try {
      console.log('chạy vào ko');
      const listMessages = await api.message.listStoredAsync({
        conversation_id: id,
        limit: 30,
      });
      const dataMessagesApi = (await getMessagesApiAsync({ conversation_id: id, limit: 30 }))
        .result as IVsocGetMessageApiArgs[];
      // console.log('api', dataMessagesApi);

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
    } catch (error) {
      console.log('lỗi ko');
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setForceRenderValue(forceRenderValue + 1);
    }, 5000);
  });

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
        console.log('có get ko');
        const data = await api.message.getNextAsync({
          conversation_id: id,
        });
        console.log('có get', data.result);
        if (data.result) {
          if (!data.result.message && data.result.action == 'WAIT') {
            setTimeout(() => getListData(id), 1000);
            return;
          }

          if (data.result.action == 'DONE') {
            // xử lý khi bot trả lời xong
            // ...
            // console.log('DONE');
            setStopGenerate(true);
            isStopAnswerRef.current = false;
            localStorage.setItem('status_bot', JSON.stringify([]));
            localStorage.setItem('answer_bot', JSON.stringify('no_answer'));
          }
          localStorage.setItem('status_bot', JSON.stringify(['sending_question']));
          localStorage.setItem('answer_bot', JSON.stringify('generating_answer'));
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
            setTimeout(() => getListData(id), 5000);
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
      localStorage.setItem('status_bot', JSON.stringify(['sending_question']));
      localStorage.setItem('answer_bot', JSON.stringify('no_answer'));
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
      // if (messages.length <= 1) {
      //   conversation_id = await createConversation(textValue, 'QA');
      //   setCurrentConversationID(conversation_id);
      //   msg.conversation_id = conversation_id;
      //   await saveMessage(msg);
      //   setForceRenderValue((prev) => prev + 1);
      // } else {
      //   conversation_id = currentConversationID;
      //   await saveMessage(msg);
      //   await api.message.sendAsync({
      //     conversation_id: conversation_id,
      //     text: textValue,
      //   });
      // }
      setTimeout(async () => {
        await getListData('1');
      }, 5000);
    } catch (error) {
      setActionMess('');
    }
  };

  const handleStopGenarate = async () => {
    isStopAnswerRef.current = true;
    setActionMess('DONE');
    messages[messages.length - 1].action = 'DONE';

    // await stopNextMessageAsync({ conversation_id: currentConversationID });
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
        if (area) area.style.left = '0px';
        sendMessages();
      }
    }
  };
  const handleBlur = () => {
    const area = document.querySelector('.container__cursor') as HTMLSpanElement;
    if (area) area.remove();
  };

  useEffect(() => {
    if (msgRef.current) {
      Prism.highlightAll();
    }
  }, [msgRef.current, actionMess]);

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
        console.log('err', err);
      });
  };

  const handleImageError = (e: any) => {
    // e.target.src = logoImage;
    setIsLoadedImgError(true);
    setSelectedImage(e.target.src);
  };

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
      if (
        actionMess === 'WAIT' &&
        !JSON.parse(localStorage.getItem('status_bot') || '[]').includes('exit_while_sending')
      ) {
        index !== streamingElementsBot.length - 1 && el.remove();
      } else {
        el.remove();
      }
    });
  }, [msgRef.current, actionMess, forceRenderValue]);

  const isCodeBlockRef = useRef(false);
  useEffect(() => {
    const preElements = document.querySelectorAll(
      'pre[class*="language"]:not([class*="language-markdown"])',
    ) as NodeListOf<HTMLElement>;

    if (preElements.length) {
      preElements.forEach((pre: HTMLElement) => {
        // Đặt position relative cho <pre>
        pre.style.position = 'relative';

        // Kiểm tra nếu nút đã tồn tại thì không tạo thêm
        if (pre.querySelector('button')) return;

        // Tạo nút button
        const copyButton = document.createElement('button');
        copyButton.innerText = 'Copy';
        copyButton.style.position = 'absolute';
        copyButton.style.top = '10px';
        copyButton.style.right = '12px';
        copyButton.style.width = '60px';
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
  }, [isCodeBlockRef.current, actionMess, msgRef.current, forceRenderValue]);

  // // Hàm tách HTML và công thức
  const parseText = (text: string) => {
    const regex = /\\(\(|\[)(.*?)\\(\)|\])/g; // Tìm công thức toán học (\\( ... \\))
    let lastIndex = 0;
    const parts = [];

    // Chạy qua tất cả các công thức toán học và chia chúng ra
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
  const [katex, setKatex] = useState<string[]>([]);
  const katexRef = useRef<Element[]>([]);

  // useEffect(() => {
  //   // Lấy tất cả các phần tử có lớp 'katex-html' và loại bỏ chúng
  //   const katexHtmlElements = document.querySelectorAll('.katex-html');
  //   katexHtmlElements.forEach((el) => el.remove());
  //   const katexMathmlElements = document.querySelectorAll('.katex');
  //   katexMathmlElements.forEach((el) => katexRef.current.push(el));
  //   const htmlStrings = katexRef.current.map((el) => el.outerHTML);
  //   setKatex(htmlStrings);
  // }, [actionMess, msgRef.current, forceRenderValue]);
  // console.log('arrr', katex);

  const copyContentRef = useRef<{ position: number; content: string }[]>([]);

  useEffect(() => {
    const contents = document.querySelectorAll('.item-chat');
    contents.forEach((el, index) => {
      const parsedContent = (el.textContent as string).replace(/\[\s?[x ]\s?\]/g, '');

      copyContentRef.current.push({ position: 2 * index + 1, content: parsedContent });
    });
  }, [forceRenderValue, actionMess, msgRef.current]);

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

  //     textarea.addEventListener('scroll', () => {
  //       mirroredEle.scrollTop = textarea.scrollTop;
  //     });

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
  //     };
  //     document.addEventListener('selectionchange', handleSelectionChange);
  //     document.addEventListener('input', handleSelectionChange);

  //     return () => {
  //       document.removeEventListener('selectionchange', handleSelectionChange);
  //       document.removeEventListener('input', handleSelectionChange);
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

  console.log('local', JSON.parse(localStorage.getItem('status_bot') || '[]'));
  console.log('localAnswer', JSON.parse(localStorage.getItem('answer_bot') || '""'));
  console.log('messageStatus', messageStatus);
  console.log('action', actionMess);

  useEffect(() => {
    return () => {
      console.log('cleanup');
      const local = JSON.parse(localStorage.getItem('status_bot') || '[]');
      if (local && local[0] === 'sending_question') {
        localStorage.setItem('status_bot', JSON.stringify(['sending_question', 'exit_while_sending']));
      }
    };
  }, []);

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
              // console.log('mark', item.message);
              const hasImage = /!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/.test(item.message);
              const hasLink = /^(?!.*!\[)[^!]*\[[^\]]+\]\([^\)]+\).*/.test(item.message);
              const hasCode =
                /<pre><code(?![^>]*class=["'][^"']*language-markdown[^"']*["'])[^\0]*>(?!.*(?:\\\(|\\\)|\\\[|\\\]|!\[.*\]\(.*\)|\[[^\]]+\]\([^\)]+\)))[\s\S]*?<\/code><\/pre>/.test(
                  item.message_html,
                );
              isCodeBlockRef.current = hasCode;
              const hasMarkdown =
                /<pre><code[^>]*class=["'][^"']*language-markdown[^"']*["'][^>]*>[\s\S]*?<\/code><\/pre>/.test(
                  item.message_html,
                );
              const hasMath = /\\\([^\)]*\\\)|\\\[([^\]]*)\\\]/.test(item.message);
              // const htmlMathBlockReplace = hasMath
              //   ? item.message_html
              //       .replace(/\(/g, '\\\\')
              //       .replace(/\)/g, '\\\\')
              //       .replace(/\[/g, '\\\\')
              //       .replace(/\]/g, '\\\\')
              //   : item.message_html;

              const parsed = parseText(item.message);
              let listLatex = [];
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
                  .map((item2: any) => ({ ...item2, content: (item2.content as string).replace(/\n/g, '') }));
              }

              // console.log('hasMath', hasMath);
              // console.log('math', listLatex);

              const renderer = new marked.Renderer();
              if (hasLink) {
                renderer.link = (href, title, text) => {
                  return `<a href="${href}" target="_blank" rel="noreferrer" style="color:#7EBBFC;">${text}</a>`;
                };
              }
              const sanitizedHtmlLink = marked(
                item.message +
                  '<span class="streaming" style="width: 11px; display: inline-block; height: 3px; background: #89a357;box-shadow: 0px 0px 4px 0px #5fff51;animation: blink 0.5s infinite;"></span>',
                { renderer },
              );

              const inputClass = item.role === 'User' ? 'user-item-chat' : 'item-chat';
              const builtinRoles: Record<string, IVsocRole> = config.builtin_roles;
              const defaultRole: IVsocRole = config.default_role;
              const colorRole = item.role in builtinRoles ? builtinRoles[item.role].color : defaultRole.color;
              const bgRole =
                item.role in builtinRoles ? builtinRoles[item.role].background_color : defaultRole.background_color;
              const imgRole = item.role in builtinRoles ? builtinRoles[item.role].avatar : defaultRole.avatar;

              const sanitizedHtml =
                DOMPurify.sanitize(item.message_html) +
                '<span class="streaming" style="width: 11px; display: inline-block; height: 3px; background: #89a357;box-shadow: 0px 0px 4px 0px #5fff51;animation: blink 0.5s infinite;"></span>';
              msgRef.current = sanitizedHtml;

              const markdownToHTML = (markdown: string) => {
                const footnotes: any[] = [];
                const content = markdown.replace(/\^(\d+)/g, (match, index) => {
                  footnotes.push({ index, content: '' });
                  return `<sup id="fnref${index}"><a href="#fn${index}">${index}</a></sup>`;
                });

                const footerContent = markdown.match(/\^(\d+)\.\s.+/g) || [];
                footerContent.forEach((line) => {
                  const match = line.match(/\^(\d+)\.\s(.+)/);
                  if (match) {
                    const [_, index, content] = match;
                    footnotes[Number(index) - 1].content = content;
                  }
                });

                const footnoteHtml = footnotes
                  .map(({ index, content }) => `<li id="fn${index}">${content} <a href="#fnref${index}">↩</a></li>`)
                  .join('');

                return `${content}<hr><ol>${footnoteHtml}</ol>`;
              };

              const converter = new showdown.Converter({ extensions: [showdownFootnotes] });

              const hasFoot = /(\[\d+\]|\^\d+)/.test(item.message);

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
                          img: ({ src, alt }) => (
                            <Tippy content="Xem chi tiết" interactive placement="top">
                              <div className="img-download">
                                <img
                                  src={!isLoadedImgError ? src : selectedImage}
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
                              </div>
                            </Tippy>
                          ),
                        }}
                      >
                        {item.message}
                      </ReactMarkdown>
                    )}
                    {hasLink && (
                      <p
                        className="item-text-chat"
                        dangerouslySetInnerHTML={{
                          __html: sanitizedHtmlLink as any,
                        }}
                      ></p>
                    )}
                    {hasCode || hasMarkdown ? (
                      <p
                        className="item-text-chat"
                        dangerouslySetInnerHTML={{
                          __html: sanitizedHtml,
                        }}
                      ></p>
                    ) : null}

                    {hasMath &&
                      listLatex.map((latex) => {
                        if (latex.type == 'html')
                          return (
                            <p
                              className="item-text-chat"
                              dangerouslySetInnerHTML={{
                                __html:
                                  DOMPurify.sanitize(latex.content) +
                                  '<span class="streaming" style="width: 11px; display: inline-block; height: 3px; background: #89a357;box-shadow: 0px 0px 4px 0px #5fff51;animation: blink 0.5s infinite;"></span>',
                              }}
                            ></p>
                          );
                        else return <InlineMath math={latex.content} />;
                      })}
                    {/* {hasFoot && (
                      <p className="item-text-chat" style={{ display: 'inline' }}>
                        <ReactMarkdown
                          children={item.message.replace(/(?<!\[)\^(\d+)(?!\])/g, '[$&]').replace(/(\d+)\./g, '[^$1]:')}
                          remarkPlugins={[remarkGfm]}
                        />
                        <span className="streaming"></span>
                      </p>
                    )} */}

                    {!hasLink && !hasImage && !hasCode && !hasMath && !hasMarkdown && !hasFoot ? (
                      item.role === 'User' ? (
                        <p className="item-text-chat">{item.message}</p>
                      ) : (
                        // <MessageComponent message={item.message} />
                        <p
                          className="item-text-chat"
                          dangerouslySetInnerHTML={{
                            __html: marked(
                              item.message +
                                '<span class="streaming" style="width: 11px; display: inline-block; height: 3px; background: #89a357;box-shadow: 0px 0px 4px 0px #5fff51;animation: blink 0.5s infinite;"></span>',
                            ) as any,
                          }}
                        ></p>
                      )
                    ) : null}
                    {/* <p
                      className="item-text-chat"
                      dangerouslySetInnerHTML={{
                        __html: markdownToHTML(`
Nội dung có chú thích^1 và thêm một chú thích nữa^2.

---

^1. Đây là nội dung chú thích 1.
^2. Đây là nội dung chú thích 2.
`),
                      }}
                    ></p> */}
                    {/* <MyComponent /> */}

                    {inputClass === 'item-chat' &&
                      hoverFeeback &&
                      hoverFeeback.msg_id === item.message_id &&
                      ((actionMess === 'WAIT' && item.action === 'DONE') || actionMess !== 'WAIT') && (
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
                            content={copiedMessage[item.message_id] ? 'Copied' : 'Copy'}
                            interactive
                            placement="bottom"
                          >
                            <IconButton
                              sx={{ padding: 0 }}
                              onClick={() => handleCopy(item.message_id as string, index)}
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
        {actionMess === 'WAIT' &&
        messageStatus?.msg_type === 'user' &&
        JSON.parse(localStorage.getItem('answer_bot') || '""') === 'no_answer' ? (
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
            />

            <Tippy content={actionMess === 'WAIT' ? 'Dừng' : 'Gửi'} interactive placement="top">
              {actionMess === 'WAIT' && messageStatus?.task_id && !stopGenerate ? (
                <button id="send-text" onClick={handleStopGenarate}>
                  <img src={PauseIcon} alt="pause-icon" />
                </button>
              ) : (
                <button
                  className={actionMess === 'WAIT' || !textValue.trim() ? 'disable-button' : ''}
                  // disabled={actionMess === 'WAIT' || !textValue.trim()}
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
                ? 'Hệ thống hiện tại chưa hỗ trợ định dạng [định dạng nhập/paste]'
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
    </div>
  );
}

export default MainScreen;
