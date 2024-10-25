import mockApi from './VsocMockApi';
import {
  IVsocApiResult,
  IVsocCreateConversationResult,
  IVsocCreateConversationArgs,
  IVsocGetNextMessageResult,
  IVsocGetNextMessageArgs,
  IVsocStoreConversationArgs,
  IVsocStoredConversation,
  IVsocListStoredConversationsArgs,
  IVsocGetSettingsArgs,
  IVsocGetSettingResult,
  IVsocStoreMessageArgs,
  IVsocListStoredMessagesArgs,
  IVsocStoredMessage,
  IVsocSendMessageArgs,
} from './VsocTypes';
import { listConversationAsync } from './conversation';
import { createConversationAsync, getNextMessageAsync, sendMessageAsync } from './eventSource';

import * as localDb from './storage/localDb';

const storeConversationAsync = (arg: IVsocStoreConversationArgs): Promise<IVsocApiResult<boolean>> => {
  return new Promise((resolve, reject) => {
    try {
      const strConversations = localStorage['conversations'] ?? '[]';
      const conversations: IVsocStoredConversation[] = JSON.parse(strConversations);
      const conv = conversations.find((c) => c.id === arg.conversation_id);
      if (conv) {
        if (arg.title && conv.title !== arg.title) {
          conv.title = arg.title;
          conv.time = new Date().getTime();
          conversations.sort((a, b) => b.time - a.time);
          localStorage['conversations'] = JSON.stringify(conversations);
        }
        resolve({
          status: 0,
          result: false,
        });
        return;
      }

      conversations.unshift({
        id: arg.conversation_id,
        title: arg.title ?? arg.conversation_id,
        time: new Date().getTime(),
      });
      localStorage['conversations'] = JSON.stringify(conversations);
      resolve({
        status: 0,
        result: true,
      });
      return;
    } catch (ex) {
      reject(ex);
    }
  });
};

const listStoredConversationAsync = (
  arg?: IVsocListStoredConversationsArgs,
): Promise<IVsocApiResult<IVsocStoredConversation[]>> => {
  return new Promise((resolve, reject) => {
    try {
      const strConversations = localStorage['conversations'] ?? '[]';
      const conversations: IVsocStoredConversation[] = JSON.parse(strConversations);
      resolve({
        status: 0,
        result: conversations,
      });
      return;
    } catch (ex) {
      reject(ex);
    }
  });
};

const storeMessageAsync = async (arg: IVsocStoreMessageArgs): Promise<IVsocApiResult<void>> => {
  await localDb.saveMessageAsync(arg.message);
  return {
    status: 0,
  };
};

const listStoredMessagesAsync = async (
  arg: IVsocListStoredMessagesArgs,
): Promise<IVsocApiResult<IVsocStoredMessage[]>> => {
  const result = await localDb.getMessagesAsync(arg);
  return {
    status: 0,
    result,
  };
};

const conversation = {
  createAsync: (arg: IVsocCreateConversationArgs): Promise<IVsocApiResult<IVsocCreateConversationResult>> =>
    createConversationAsync(arg),
  storeAsync: storeConversationAsync,
  listStoredAsync: listStoredConversationAsync,
  listAsync: listConversationAsync,
};

const message = {
  getNextAsync: (arg: IVsocGetNextMessageArgs): Promise<IVsocApiResult<IVsocGetNextMessageResult>> =>
    getNextMessageAsync(arg),
  sendAsync: (arg: IVsocSendMessageArgs): Promise<IVsocApiResult<IVsocCreateConversationResult>> =>
    sendMessageAsync(arg),
  storeAsync: storeMessageAsync,
  listStoredAsync: listStoredMessagesAsync,
};

const setting = {
  getAsync: (arg?: IVsocGetSettingsArgs): Promise<IVsocApiResult<IVsocGetSettingResult[]>> =>
    mockApi.getSettingsAsync(arg),
};

const api = {
  conversation,
  message,
  setting,
};

export default api;
