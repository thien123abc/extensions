import {
  IVsocApiResult,
  IVsocListStoredConversationsArgs,
  IVsocStoreConversationArgs,
  IVsocStoredConversation,
} from './VsocTypes';
import config from '../env.json';

interface IDifyConversation {
  id: string;
  name: string;
  created_at: number;
}

export const listConversationAsync = async (
  arg?: IVsocListStoredConversationsArgs,
): Promise<IVsocApiResult<IVsocStoredConversation[]>> => {
  const response = await fetch(
    `${config.vsoc_api_url}/api/conversations?limit=${arg?.limit ?? 100}&pinned=${arg?.pinned ?? false}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.bot_token}`,
        'Content-Type': 'application/json',
      },
    },
  );
  const body = await response.json();
  const result = (body.data as IDifyConversation[]).map((conv) => {
    return {
      id: conv.id,
      time: conv.created_at * 1000,
      title: conv.name,
    } as IVsocStoredConversation;
  });
  console.log(result);
  return {
    status: 0,
    result: result.sort((a, b) => b.time - a.time),
  };
};

export const saveConversationAsync = async (
  arg: Required<IVsocStoreConversationArgs>,
): Promise<IVsocApiResult<IVsocStoredConversation>> => {
  const response = await fetch(`${config.vsoc_api_url}/api/conversations/${arg.conversation_id}/name`, {
    method: 'POST',
    body: JSON.stringify({
      name: arg.title,
    }),
    headers: {
      Authorization: `Bearer ${localStorage.bot_token}`,
      'Content-Type': 'application/json',
    },
  });
  const { id, name: title, created_at: time } = await response.json();
  return {
    status: 0,
    result: { id, title, time: time * 1000 },
  };
};

export const deleteConversationAsync = async (arg: IVsocStoreConversationArgs): Promise<IVsocApiResult<string>> => {
  await fetch(`${config.vsoc_api_url}/api/conversations/${arg.conversation_id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.bot_token}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    status: 0,
  };
};
