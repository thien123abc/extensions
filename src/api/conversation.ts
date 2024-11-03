import { IVsocApiResult, IVsocListStoredConversationsArgs, IVsocStoredConversation } from './VsocTypes';
import config from '../env.json';

interface IDifyConversation {
  id: string;
  name: string;
  created_at: number;
}

export const listConversationAsync = async (
  arg?: IVsocListStoredConversationsArgs,
): Promise<IVsocApiResult<IVsocStoredConversation[]>> => {
  // const response = await fetch(
  //   `${config.vsoc_api_url}/api/conversations?limit=${arg?.limit ?? 100}&pinned=${arg?.pinned ?? false}`,
  //   {
  //     method: 'GET',
  //     headers: {
  //       Authorization: `Bearer ${localStorage.bot_token}`,
  //       'Content-Type': 'application/json',
  //     },
  //   },
  // );
  // const body = await response.json();
  // const result = (body.data as IDifyConversation[]).map((conv) => {
  //   return {
  //     id: conv.id,
  //     time: conv.created_at * 1000 - 7 * 3600000,
  //     title: conv.name,
  //   } as IVsocStoredConversation;
  // });
  const result = [
    {
      id: 'idconversation1',
      title: 'Hội Thoại 1',
      time: 1727846400000,
    },
    {
      id: 'idconversation2',
      title: 'Hội Thoại 2',
      time: 1727898700000,
    },
    {
      id: 'idconversation3',
      title: 'Hội Thoại 3',
      time: 1727899900000,
    },
    {
      id: 'idconversation4',
      title: 'Hội Thoại 4',
      time: 1727888800000,
    },
    {
      id: 'idconversation5',
      title: 'Hội Thoại 5',
      time: 1727866600000,
    },
  ];
  console.log(result);
  return {
    status: 0,
    result,
  };
};
