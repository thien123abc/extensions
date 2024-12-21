export type VsocUserAction = 'WAIT' | 'DONE' | 'PROMT';
export type VsocMessageType = 'text' | 'break_paragraph';
export type VsocConversationType = 'QA' | 'monitor';

export interface IVsocApiResult<T> {
  status: number;
  sub_status?: number;
  description?: string;
  result?: T;
}

export interface IVsocCreateConversationArgs {
  text: string;
  type: VsocConversationType;
  parentMsgId: string | null;
}

export interface IVsocSendMessageArgs {
  text: string;
  conversation_id: string;
  parentMsgId: string | null;
}

export interface IVsocCreateConversationResult {
  conversation_id: string;
  action: VsocUserAction;
}

export interface IVsocGetNextMessageArgs {
  conversation_id: string;
}
export interface IVsocGetMessageApiArgs {
  conversation_id: string;
  message_id: string;
  answer: string;
  feedback: { rating: 'like' | 'dislike' } | null;
  created_at: number;
}

export interface IVsocGetNextMessageResult extends IVsocStoredMessage {
  role: string;
}

export interface IVsocStoreMessageArgs {
  message: IVsocStoredMessage;
}

export interface IVsocStoredMessage {
  conversation_id: string;
  action: VsocUserAction;
  role: string;
  message: string;
  type: VsocMessageType;
  time: number;
  message_id?: string;
  feedback?: { rating: 'like' | 'dislike' } | null;
  task_id?: string;
  event: 'node' | 'message';
  node_title: string;
  elapsed_time: number;
}

export interface IVsocStoreConversationArgs {
  conversation_id: string;
  title?: string;
}

export interface IVsocListStoredConversationsArgs {
  limit?: number;
  pinned?: boolean;
}

export interface IVsocStoredConversation {
  id: string;
  title: string;
  time: number;
}

export interface IVsocGetSettingsArgs {}

export interface IVsocMonitorSetting {
  pathPattern: string;
  contentDomPath: string;
  injectedDomPath: string;
}

export interface IVsocSetting {
  domain: string;
  monitor: IVsocMonitorSetting[];
}

export interface IVsocGetSettingResult extends IVsocSetting {}

export interface IVsocMessageQuery {
  conversation_id: string;
  limit?: number;
  from?: number;
  to?: number;
}

export interface IVsocListStoredMessagesArgs extends IVsocMessageQuery {}

export interface IChromeMessage {
  type: string;
  [key: string]: any;
}
export interface IChromeResponseMessage {
  type?: string;
  error?: boolean;
  [key: string]: any;
}

export interface IChromeGetSettingsMessageResult extends IChromeResponseMessage {
  value: IVsocSetting[];
}

export interface IVsocRole {
  color: string;
  avatar: string;
  background_color: string;
}

export interface IVsocMessageApiResponse {
  answer?: string;
  conversation_id: string;
  created_at?: number;
  error?: string;
  feedback?: { rating: 'like' | 'dislike' } | null;
  id: string;
  query?: string;
}

export interface IVsocParametersResponse {
  opening_statement: string;
  suggested_questions: string[];
  suggested_questions_after_answer: {
    enabled: boolean;
  };
}

export interface IVsocParametersResponseWithComplexQuestions
  extends Omit<IVsocParametersResponse, 'suggested_questions'> {
  suggested_questions: { text: string; isComplex: boolean }[];
}
