import {
  IVsocApiResult,
  IVsocCreateConversationArgs,
  IVsocCreateConversationResult,
  IVsocGetNextMessageArgs,
  IVsocGetNextMessageResult,
  IVsocSendMessageArgs,
} from './VsocTypes';
import config from '../env.json';

async function* getAllTextLinesIterator(url: string, options: RequestInit) {
  const utf8Decoder = new TextDecoder('utf-8');
  const response = await fetch(url, options);
  if (!response.body) return;
  const reader = response.body.getReader();
  let { value: byteArray, done: readerDone } = await reader.read();
  let chunk = byteArray ? utf8Decoder.decode(byteArray, { stream: true }) : '';

  const re = /\r\n|\n|\r/gm;
  let startIndex = 0;

  for (;;) {
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
}

interface IDifyMessage {
  event: string;
  conversation_id: string;
  message_id: string;
  title?: string;
  answer?: string;
  created_at: number;
  data?: IDifyMessageData;
  [key: string]: unknown;
}

interface IConversationHub extends Record<string, IMessageQueue[]> {}
interface IMessageQueue extends IVsocGetNextMessageResult {}

const conversationHub: IConversationHub = {};
let bot_token: string = '';

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
    localStorage.bot_token = bot_token;

    if (!bot_token) {
      const ex = new Error('Unable to get passport token');
      console.error(ex);
      reject(ex);
    }
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

const markDifyResponseEnd = (conversationId: string, lastRoleInMessage: string, reject?: ResolveFunction) => {
  if (reject) return;
  const msg: IMessageQueue = {
    action: 'DONE',
    type: 'break_paragraph',
    conversation_id: conversationId,
    time: new Date().getTime(),
    role: lastRoleInMessage,
    message: '',
  };
  conversationHub[conversationId].push(msg);
  console.log('received finnal message: ', msg);
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
    return false;
  }
  return true;
};

const connectToBotAsync = (arg: IVsocCreateConversationArgs | IVsocSendMessageArgs) => {
  return new Promise<IVsocApiResult<IVsocCreateConversationResult>>(async (resolve, reject) => {
    let conversationId = '';
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
        }),
        headers: {
          Authorization: `Bearer ${bot_token}`,
          'Content-Type': 'application/json',
        },
      };

      for await (const line of getAllTextLinesIterator(fetchUrl, fetchOptions)) {
        const evt = parseDifyMesssage(line);
        if (!evt) continue;
        if (!conversationId && evt.conversation_id) {
          fnReject = undefined;
          conversationId = evt.conversation_id;
          if (!(conversationId in conversationHub)) {
            console.log('Created conversation ', conversationId);
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

        const msg: IMessageQueue = {
          action: 'WAIT',
          type: 'text', //paragraphType,
          conversation_id: conversationId,
          time: new Date().getTime(),
          role: roleInfo.currentRole,
          message: evt.answer as string,
        };
        conversationHub[conversationId].push(msg);
        console.log('received message: ', msg);
        roleInfo.lastRoleInMessage = roleInfo.currentRole;
      }
    } catch (ex) {
      console.error(ex);
      fnReject?.(ex);
    } finally {
      markDifyResponseEnd(conversationId, roleInfo.lastRoleInMessage, fnReject);
    }
  });
};

export const createConversationAsync = (arg: IVsocCreateConversationArgs) => connectToBotAsync(arg);

export const sendMessageAsync = (arg: IVsocSendMessageArgs) => connectToBotAsync(arg);

export const getNextMessageAsync = (arg: IVsocGetNextMessageArgs) => {
  return new Promise<IVsocApiResult<IVsocGetNextMessageResult>>((resolve) => {
    if (!arg.conversation_id || !(arg.conversation_id in conversationHub)) {
      throw new Error(`conversation_id ${arg.conversation_id} is not found`);
    }
    const queue = conversationHub[arg.conversation_id];
    let message = queue.shift();
    if (!message)
      message = {
        conversation_id: arg.conversation_id,
        action: 'WAIT',
        message: '',
        time: new Date().getTime(),
        type: 'text',
        role: '',
      };
    resolve({
      status: 0,
      result: message,
    });
  });
};
