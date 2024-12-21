import {
  IVsocApiResult,
  IVsocCreateConversationArgs,
  IVsocCreateConversationResult,
  IVsocGetMessageApiArgs,
  IVsocGetNextMessageArgs,
  IVsocGetNextMessageResult,
  IVsocMessageApiResponse,
  IVsocMessageQuery,
  IVsocParametersResponse,
  IVsocSendMessageArgs,
} from './VsocTypes';
import config from '../env.json';
import { toast } from 'react-toastify';
import { StatusNode } from '../utils/constantType';

async function* getAllTextLinesIterator(url: string, options: RequestInit) {
  const utf8Decoder = new TextDecoder('utf-8');
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json();
    let message_error = '';
    if (errorData.status === 404 && errorData.code === 'not_found')
      message_error =
        'The system is currently interrupted. Please create a new conversation to try again or contact the product team for assistance.';
    else if (errorData.status === 400 && errorData.code === 'invalid_param') {
      if (!errorData.message.includes('Run failed:'))
        message_error =
          'The system is currently interrupted. Please create a new conversation to try again or contact the product team for assistance.';
      else message_error = 'Please wait a few minutes and try again, or contact the product team for assistance.';
    } else if (errorData.status === 400 && errorData.code === 'bad_request')
      message_error = 'The endpoint is currently unavailable. Please select a different endpoint.';
    else if (errorData.code === 'unknown')
      message_error =
        'The system is experiencing an issue. Please try again later or contact the product team for assistance.';
    else if (errorData.status === 500 && errorData.code === 'internal_server_error')
      message_error =
        'The system is experiencing an issue. Please try again later or contact the product team for assistance.';
    message_error &&
      toast.error(message_error, {
        position: 'top-center',
        autoClose: 3000,
        closeOnClick: true,
        progress: 0,
        style: {
          width: 'auto',
          minWidth: '400px',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
        },
      });
    return;
  }

  if (!response.body) return;
  const reader = response.body.getReader();
  let { value: byteArray, done: readerDone } = await reader.read();
  let chunk = byteArray ? utf8Decoder.decode(byteArray, { stream: true }) : '';

  const re = /\r\n|\n|\r/gm;
  let startIndex = 0;

  for (let i = 0; ; i++) {
    const result = re.exec(chunk);
    if (!result) {
      if (readerDone) {
        break;
      }
      const remainder = chunk.substring(startIndex);
      ({ value: byteArray, done: readerDone } = await reader.read());
      chunk = remainder + (byteArray ? utf8Decoder.decode(byteArray, { stream: true }) : '');
      startIndex = re.lastIndex = 0;
      continue;
    }
    yield chunk.substring(startIndex, result.index);
    startIndex = re.lastIndex;
  }
  if (startIndex < chunk.length) {
    // last line didn't end in a newline char
    yield chunk.substring(startIndex);
  }
}

interface IDifyMessageData {
  title?: string;
  elapsed_time?: number;
}

interface IDifyMessage {
  event: string;
  conversation_id: string;
  message_id: string;
  title?: string;
  answer?: string;
  created_at: number;
  data?: IDifyMessageData;
  task_id?: string;
  [key: string]: unknown;
}

interface IConversationHub extends Record<string, IMessageQueue[]> {}
interface IMessageQueue extends IVsocGetNextMessageResult {}

const conversationHub: IConversationHub = {};
let bot_token: string = '';
let viewTimeHub: number[] = [];

const fetchAccessToken = async (reject: ResolveFunction, force = false) => {
  try {
    if (bot_token && !force) return;

    if (!force) {
      bot_token = localStorage.bot_token;
      if (bot_token) return;
    }

    const response = await fetch(config.vsoc_api_url + '/api/passport', {
      method: 'GET',
      headers: {
        'X-App-Code': config.bot_app_code,
      },
    });
    const body = await response.json();

    bot_token = body.access_token;
    // localStorage.bot_token = bot_token;

    if (!bot_token) {
      const ex = new Error('Unable to get passport token');
      console.error(ex);
      toast.error('The endpoint is currently unavailable. Please select a different endpoint.', {
        position: 'top-center',
        autoClose: 3000,
        closeOnClick: true,
        progress: 0,
        style: {
          width: 'auto',
          minWidth: '360px',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
        },
      });
      reject(ex);
    } else localStorage.bot_token = bot_token;
  } catch (ex) {
    console.error(ex);
    reject(ex);
  }
};

const parseDifyMesssage = (line: string): IDifyMessage | undefined => {
  if (!line || !line.startsWith('data:')) return undefined;
  try {
    const evt = JSON.parse(line.substring(5)) as IDifyMessage;
    if (!evt || typeof evt !== 'object') return undefined;
    return evt;
  } catch (e) {
    return undefined;
  }
};

type ResolveFunction = (reason?: any) => void;

const markDifyResponseEnd = (
  conversationId: string,
  lastRoleInMessage: string,
  ids: { msg_id: string; task_id: string },
  reject?: ResolveFunction,
) => {
  if (reject) return;
  const msg: IMessageQueue = {
    action: 'DONE',
    type: 'break_paragraph',
    conversation_id: conversationId,
    time: new Date().getTime(),
    role: lastRoleInMessage,
    message: '',
    message_id: ids.msg_id,
    task_id: ids.task_id,
    event: 'message',
    node_title: '',
    elapsed_time: 0,
  };
  conversationHub[conversationId].push(msg);
  const nodes = JSON.parse(localStorage.getItem('nodes') || '[]');
  console.log('có ko', viewTimeHub);
  const existingEntry = nodes.find(
    (entry: any) => entry.conversation_id === conversationId && entry.msg_id === ids.msg_id,
  );
  const restEntry = nodes.filter(
    (entry: any) => entry.conversation_id !== conversationId || entry.msg_id !== ids.msg_id,
  );

  if (existingEntry) {
    const totalTimeMs = viewTimeHub.reduce((sum: number, value: number) => sum + value, 0);
    const totalTimeSec = Math.ceil((totalTimeMs / 1000) * 1000) / 1000; // Chuyển đổi và làm tròn
    existingEntry.totalTime = totalTimeSec.toFixed(3); // Đảm bảo định dạng 3 chữ số thập phân
    localStorage.setItem('nodes', JSON.stringify([...restEntry, existingEntry]));
    console.log('totaltime', totalTimeSec.toFixed(3));
  }
  viewTimeHub = [];
};

type RoleInfo = {
  currentRole: string;
  lastRoleInMessage: string;
};

const extractRole = (evt: IDifyMessage, roleInfo: RoleInfo) => {
  if (evt.data?.title?.charAt(0) == '[') {
    const m = evt.data.title.match(/^\[([^\]]+)\]/);
    if (m?.[1]) {
      roleInfo.currentRole = m[1];
    }
  }

  if (evt.event != 'message' || !evt.answer || config.ignore_roles.includes(roleInfo.currentRole)) {
    if (evt.event === 'message_end') {
      setTimeout(() => {
        const nodes = JSON.parse(localStorage.getItem('nodes') || '[]');
        const existingEntry = nodes.find(
          (entry: any) => entry.conversation_id === evt.conversation_id && entry.msg_id === evt.message_id,
        );
        const restEntry = nodes.filter(
          (entry: any) => entry.conversation_id !== evt.conversation_id || entry.msg_id !== evt.message_id,
        );

        if (existingEntry) {
          if (
            existingEntry?.node_titles.length === existingEntry?.time?.length &&
            existingEntry?.is_completed !== StatusNode.UNFINISHED
          ) {
            existingEntry.is_completed = StatusNode.FINISHED;
            localStorage.setItem('nodes', JSON.stringify([...restEntry, existingEntry]));
          }
        }
      }, 5000);
      return false;
    }
    // if (evt.event === 'node_started' || evt.event === 'node_finished') {
    if (evt.event === 'node_finished') {
      viewTimeHub.push(evt?.data?.elapsed_time as number);
      // }
      // Nếu title có dấu ngoặc vuông, kiểm tra nội dung trong đó
      const m = evt.data?.title?.match(/^\[([^\]]+)\]/);
      if (m?.[1]) {
        const roleInTitle = m[1].toLowerCase(); // Chuyển nội dung role trong ngoặc vuông thành chữ thường
        if (roleInTitle !== 'system') {
          // Nếu nội dung trong ngoặc vuông khác "System", trả về true
          return true;
        }
      }
    }
    return false;
  }

  return true;
};

const connectToBotAsync = (arg: IVsocCreateConversationArgs | IVsocSendMessageArgs, signal: AbortSignal) => {
  return new Promise<IVsocApiResult<IVsocCreateConversationResult>>(async (resolve, reject) => {
    let conversationId = '';
    const ids = { msg_id: '', task_id: '' };
    const roleInfo: RoleInfo = {
      currentRole: '',
      lastRoleInMessage: '',
    };
    let fnReject: ResolveFunction | undefined = reject;

    await fetchAccessToken(reject);

    try {
      const fetchUrl = config.vsoc_api_url + '/api/chat-messages';
      const fetchOptions = {
        method: 'POST',
        body: JSON.stringify({
          response_mode: 'streaming',
          conversation_id: (arg as IVsocSendMessageArgs).conversation_id ?? '',
          query: arg.text,
          inputs: {},
          parent_message_id: arg.parentMsgId,
        }),
        signal,
        headers: {
          Authorization: `Bearer ${bot_token}`,
          'Content-Type': 'application/json',
        },
      };
      for await (const line of getAllTextLinesIterator(fetchUrl, fetchOptions)) {
        if (signal.aborted) {
          console.log('Yêu cầu lấy dữ liệu bị hủy bỏ');
          reject(new Error('Request was aborted'));
          return;
        }
        const evt = parseDifyMesssage(line);

        if (!evt) continue;

        // Kiểm tra và xử lý localStorage
        const lastestKey = 'lastest';
        const lastestData = localStorage.getItem(lastestKey);
        let lastestArray: Array<{ conversation_id: string; lastestMsgId: string }> = [];

        if (lastestData) {
          // Parse JSON nếu đã tồn tại
          lastestArray = JSON.parse(lastestData);

          // Tìm phần tử có conversation_id
          const index = lastestArray.findIndex((item) => item.conversation_id === evt.conversation_id);
          if (index !== -1) {
            // Nếu tồn tại, cập nhật lastestMsgId
            lastestArray[index].lastestMsgId = evt.message_id;
          } else {
            // Nếu không tồn tại, thêm mới phần tử
            lastestArray.push({ conversation_id: evt.conversation_id, lastestMsgId: evt.message_id });
          }
        } else {
          // Nếu chưa tồn tại, khởi tạo mảng mới với object ban đầu
          lastestArray = [{ conversation_id: evt.conversation_id, lastestMsgId: evt.message_id }];
        }

        // Lưu lại vào localStorage
        localStorage.setItem(lastestKey, JSON.stringify(lastestArray));
        // console.log('evt', localStorage.getItem(lastestKey));
        if (!conversationId && evt.conversation_id) {
          fnReject = undefined;
          conversationId = evt.conversation_id;
          if (!(conversationId in conversationHub)) {
            conversationHub[conversationId] = [];
          }
          resolve({
            status: 0,
            result: {
              action: 'WAIT',
              conversation_id: conversationId,
            },
          });
        }

        if (!extractRole(evt, roleInfo)) continue;

        let msg: IMessageQueue;

        if (evt.event === 'node_started' || evt.event === 'node_finished') {
          msg = {
            action: 'WAIT',
            type: 'text', //paragraphType,
            conversation_id: conversationId,
            time: new Date().getTime(),
            role: roleInfo.currentRole,
            message: '',
            message_id: evt.message_id,
            task_id: evt.task_id,
            event: 'node',
            node_title: evt?.data?.title as string,
            elapsed_time: evt.event === 'node_finished' ? Number(evt?.data?.elapsed_time) : 0,
          };
        } else {
          msg = {
            action: 'WAIT',
            type: 'text', //paragraphType,
            conversation_id: conversationId,
            time: new Date().getTime(),
            role: roleInfo.currentRole,
            message: evt.answer as string,
            message_id: evt.message_id,
            task_id: evt.task_id,
            event: 'message',
            node_title: '',
            elapsed_time: 0,
          };
        }

        ids.msg_id = evt.message_id;
        ids.task_id = evt.task_id as string;
        conversationHub[conversationId].push(msg);
        roleInfo.lastRoleInMessage = roleInfo.currentRole;
        // console.log('gethub', conversationHub[conversationId]);
      }
    } catch (ex) {
      console.error(ex);
      fnReject?.(ex);
    } finally {
      markDifyResponseEnd(conversationId, roleInfo.lastRoleInMessage, ids, fnReject);
    }
  });
};

export const createConversationAsync = (arg: IVsocCreateConversationArgs, signal: AbortSignal) =>
  connectToBotAsync(arg, signal);

export const sendMessageAsync = (arg: IVsocSendMessageArgs, signal: AbortSignal) => connectToBotAsync(arg, signal);

export const getNextMessageAsync = (arg: IVsocGetNextMessageArgs) => {
  return new Promise<IVsocApiResult<IVsocGetNextMessageResult>>((resolve) => {
    if (!arg.conversation_id || !(arg.conversation_id in conversationHub)) {
      throw new Error(`conversation_id ${arg.conversation_id} is not found`);
    }

    // Lọc mảng để lấy phần tử có message_id = 1
    const filteredMessages = conversationHub[arg.conversation_id].filter(
      (item) =>
        item.message_id ===
        JSON.parse(localStorage.getItem('lastest') || '[]')?.find(
          (entry: any) => entry?.conversation_id === arg.conversation_id,
        )?.lastestMsgId,
    );

    // Lấy phần tử đầu tiên trong mảng đã lọc
    let message = filteredMessages[0];

    // Xóa phần tử này khỏi mảng gốc
    const indexToRemove = conversationHub[arg.conversation_id].findIndex((item) => item === message);
    if (indexToRemove !== -1) {
      conversationHub[arg.conversation_id].splice(indexToRemove, 1); // Xóa phần tử
    }

    if (!message)
      message = {
        conversation_id: arg.conversation_id,
        action: 'WAIT',
        message: '',
        time: new Date().getTime(),
        type: 'text',
        role: '',
        message_id: JSON.parse(localStorage.getItem('lastest') || '[]')?.find(
          (entry: any) => entry?.conversation_id === arg.conversation_id,
        )?.lastestMsgId,
        event: 'message',
        node_title: '',
        elapsed_time: 0,
      };
    resolve({
      status: 0,
      result: message,
    });
  });
};

export const stopNextMessageAsync = (arg: IVsocGetNextMessageArgs) => {
  return new Promise<IVsocApiResult<IVsocGetNextMessageResult>>((resolve) => {
    // const last_msg_local = JSON.parse(localStorage.getItem('lastest') || '[]')?.find(
    //   (entry: any) => entry?.conversation_id === arg.conversation_id,
    // );
    // const _restLastLocal = JSON.parse(localStorage.getItem('lastest') || '[]')?.filter(
    //   (entry: any) => entry?.conversation_id !== arg.conversation_id,
    // );
    // if (last_msg_local) {
    //   last_msg_local.lastestMsgId = '';
    // }
    // localStorage.setItem('lastest', JSON.stringify([..._restLastLocal, last_msg_local]));
    conversationHub[arg?.conversation_id] = [];

    resolve({
      status: 0,
    });
  });
};

export const getMessagesApiAsync = async (
  arg: IVsocMessageQuery,
): Promise<IVsocApiResult<IVsocGetMessageApiArgs[]>> => {
  const limit = !arg.limit || arg.limit < 0 ? 20 : arg.limit;
  const params = new URLSearchParams({
    conversation_id: arg.conversation_id || '',
    limit: limit.toString(),
  });
  const response = await fetch(`${config.vsoc_api_url}/api/messages?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.bot_token}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await response.json();

  if (body.status === 401 && body.code === 'unauthorized') {
    toast.error('The endpoint is currently unavailable. Please select a different endpoint.', {
      position: 'top-center',
      autoClose: 3000,
      closeOnClick: true,
      progress: 0,
      style: {
        width: 'auto',
        minWidth: '360px',
        whiteSpace: 'normal',
        wordWrap: 'break-word',
      },
    });
    return {
      status: 401,
      result: undefined,
    };
  }

  const result = (body.data as IVsocMessageApiResponse[]).map((conv) => {
    return {
      message_id: conv.id,
      conversation_id: conv.conversation_id,
      answer: conv.answer,
      feedback: conv.feedback,
      created_at: conv.created_at,
    } as IVsocGetMessageApiArgs;
  });

  return {
    status: 0,
    result: result,
  };
};

export const feedbackMessageAsync = async (arg: {
  message_id: string;
  rating: 'like' | 'dislike' | null;
}): Promise<IVsocApiResult<string>> => {
  const response = await fetch(`${config.vsoc_api_url}/api/messages/${arg.message_id}/feedbacks`, {
    method: 'POST',
    body: JSON.stringify({
      rating: arg.rating,
    }),
    headers: {
      Authorization: `Bearer ${localStorage.bot_token}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await response.json();

  return {
    status: 0,
    result: 'ok',
  };
};

export const getParametersAsync = async (): Promise<IVsocApiResult<IVsocParametersResponse>> => {
  await fetchAccessToken(Promise.resolve);

  const response = await fetch(`${config.vsoc_api_url}/api/parameters`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.bot_token}`,
      'Content-Type': 'application/json',
    },
  });
  const { opening_statement, suggested_questions, suggested_questions_after_answer } = await response.json();

  const result: IVsocParametersResponse = {
    opening_statement,
    suggested_questions,
    suggested_questions_after_answer,
  };

  return {
    status: 0,
    result,
  };
};
