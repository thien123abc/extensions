import {
  IVsocApiResult,
  IVsocCreateConversationArgs,
  IVsocCreateConversationResult,
  IVsocGetNextMessageArgs,
  IVsocGetNextMessageResult,
  IVsocGetSettingsArgs,
  IVsocGetSettingResult,
  VsocMessageType,
  VsocUserAction,
} from './VsocTypes';

//#region conversation
const createConversationAsync = (arg: IVsocCreateConversationArgs) => {
  console.log('MOCK api conversation.create', arg);
  return new Promise<IVsocApiResult<IVsocCreateConversationResult>>((resolve) => {
    setTimeout(
      () =>
        resolve({
          status: 0,
          description: 'MOCK api conversation.create',
          result: {
            conversation_id: 'mock-conversation-' + new Date().getTime(),
            action: 'WAIT',
          },
        }),
      generateRandomInteger(1000, 2000),
    );
  });
};
//#endregion

//#region mesage
const messages = [
  'Có hỗ trợ markdown: *bold*, _italic_,\n\nLine 2\n\n* Option 1\n* Option 2',
  'Đây là một câu hỏi *khó*',
  'Đó là một hành động *nguy hiểm*, xin hãy thận trọng',
  'Có tất cả *10* cảnh báo liên quan',
  'In publishing and graphic design,\n\nLorem ipsum is a placeholder text commonly used to demonstrate the visual form of a document or a typeface without relying on meaningful content.\n\nLorem ipsum may be used as a placeholder before the final copy is available.',
  'Có rất nhiều dữ liệu nhưng hầu như không có thông tin',
  'Hãy quay lại 3 bước rồi thử lại',
  'Đây là một câu trả lời rất dài: \n\nTrong xuất bản và thiết kế đồ họa, Lorem ipsum là một văn bản giữ chỗ thường được sử dụng để thể hiện hình thức trực quan của một tài liệu hoặc một kiểu chữ mà không cần dựa vào nội dung có ý nghĩa.\n\nLorem ipsum có thể được sử dụng làm phần giữ chỗ trước khi có bản sao cuối cùng. Trong xuất bản và thiết kế đồ họa, Lorem ipsum là một văn bản giữ chỗ thường được sử dụng để thể hiện hình thức trực quan của một tài liệu hoặc một kiểu chữ mà không cần dựa vào nội dung có ý nghĩa.\n\nLorem ipsum có thể được sử dụng làm phần giữ chỗ trước khi có bản sao cuối cùng.',
  '2 dòng luôn:\n\nLine 1\n\nLine 2',
  'Bố mẹ Đức có 4 anh chị em là *Xuân, Hạ, Thu*. Hỏi con út tên là gì?',
  'Hầu hết người dùng *mở thêm* tab mới khi mạng chậm',
  'Tỉnh _Hà Giang_',
  'Tỉnh _Cao Bằng_',
  'Tỉnh _Lào Cai_',
  'Tỉnh _Sơn La_',
  'Tỉnh _Lai Châu_',
];
interface IRandomableSeeding<T> {
  values: T[];
  ranges: number[];
}
const roles: IRandomableSeeding<string> = {
  values: ['SOC_Manager', 'Tier_1', 'Tier_3'],
  ranges: [0.3, 0.9],
};
const actions: IRandomableSeeding<VsocUserAction> = {
  values: ['WAIT', 'DONE'],
  ranges: [0.75],
};
const meseageTypes: IRandomableSeeding<VsocMessageType> = {
  values: ['text', 'break_paragraph'],
  ranges: [0.25],
};

const generateRandomNumber = (min: number, max: number) => Math.random() * (max - min) + min;
const generateRandomInteger = (min: number, max: number) => Math.floor(generateRandomNumber(min, max));

const getRandomValue = <T>(seeding: IRandomableSeeding<T>): T => {
  const randomValue = generateRandomNumber(0, 1);
  let value = seeding.values[0];
  for (let i = 0; i < seeding.ranges.length; i++) {
    if (seeding.ranges[i] >= randomValue) break;
    value = seeding.values[i + 1];
  }
  return value;
};
const getRandomMessage = (): string => {
  return messages[generateRandomInteger(0, messages.length)];
};

const getNextMessageAsync = (arg: IVsocGetNextMessageArgs) => {
  console.log('MOCK api message.getNext', arg);
  return new Promise<IVsocApiResult<IVsocGetNextMessageResult>>((resolve) => {
    setTimeout(
      () =>
        resolve({
          status: 0,
          description: 'MOCK api message.getNext',
          result: {
            conversation_id: arg.conversation_id,
            action: getRandomValue(actions),
            role: getRandomValue(roles),
            message: getRandomMessage(),
            type: getRandomValue(meseageTypes),
            time: new Date().getTime(),
          },
        }),
      generateRandomInteger(100, 300),
    );
  });
};
//#endregion

//#region Setting
const getSettingsAsync = (arg?: IVsocGetSettingsArgs): Promise<IVsocApiResult<IVsocGetSettingResult[]>> => {
  console.log('MOCK api setting.get', arg);
  return new Promise<IVsocApiResult<IVsocGetSettingResult[]>>((resolve) => {
    setTimeout(
      () =>
        resolve({
          status: 0,
          result: [
            {
              domain: 'soar.sirc.viettel.com',
              monitor: [
                {
                  pathPattern: '^/',
                  contentDomPath: '.mat-dialog-container app-alert-event-detail .alert-event-detail-content--body',
                  injectedDomPath:
                    '.mat-dialog-container app-alert-event-detail .alert-event-detail-content--header .title-popup',
                },
              ],
            },
            {
              domain: 'stackoverflow.com',
              monitor: [
                {
                  pathPattern: '^/questions/\\d+/',
                  contentDomPath: '.sidebar-related .related.js-gps-related-questions',
                  injectedDomPath: '.sidebar-related h4',
                },
              ],
            },
            {
              domain: 'f2dr.test.viettelcybersecurity.com',
              monitor: [
                {
                  pathPattern: '^/forensic',
                  contentDomPath: '#forensic-right-detail mat-tab-body event-detail',
                  injectedDomPath: '#forensic-right-detail mat-tab-header .mat-tab-list .mat-tab-label-content',
                },
              ],
            },
          ],
        }),
      generateRandomInteger(500, 1000),
    );
  });
};
//#endregion

const mockApi = {
  createConversationAsync,
  getNextMessageAsync,
  getSettingsAsync,
};

export default mockApi;
