import { IVsocMessageQuery, IVsocStoredMessage } from '../VsocTypes';

let db: IDBDatabase;
let dbStatus: 'init' | 'ready' | 'error' = 'init';

const init = () => {
  if (!globalThis.window || !window.indexedDB) return;
  const dbOpenRequest = window.indexedDB.open('vsoc', 1);

  dbOpenRequest.onsuccess = () => {
    db = dbOpenRequest.result;
    dbStatus = 'ready';
  };

  dbOpenRequest.onerror = (err) => {
    console.error(err);
    dbStatus = 'error';
  };

  dbOpenRequest.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
    const database: IDBDatabase = (ev.target as any).result;
    database.onerror = () => (dbStatus = 'error');

    const objectStore = database.createObjectStore('message', {
      autoIncrement: true,
    });

    objectStore.createIndex('_id', ['conversation_id', 'time']);
  };
};

export const getDbStatus = () => dbStatus;

export const saveMessageAsync = (message: IVsocStoredMessage) => {
  if (dbStatus != 'ready') throw Error('LocalDb is not ready');
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['message'], 'readwrite');
    const messageStore = transaction.objectStore('message');
    const request = messageStore.add(message);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
};

const processMessage = (
  message: IVsocStoredMessage,
  messages: IVsocStoredMessage[],
  partialMessage: IVsocStoredMessage | undefined,
): IVsocStoredMessage | undefined => {
  if (!partialMessage || message.type === 'break_paragraph' || message.role !== partialMessage.role) {
    partialMessage = message;
    messages.push(partialMessage);
    return message;
  }

  partialMessage.message = message.message + partialMessage.message;
  partialMessage.time = message.time;

  return partialMessage;
};

export const getMessagesAsync = (query: IVsocMessageQuery) => {
  if (dbStatus != 'ready') throw Error('LocalDb is not ready');

  const limit = !query.limit || query.limit < 0 ? 20 : query.limit;

  return new Promise<IVsocStoredMessage[]>((resolve, reject) => {
    const transaction = db.transaction(['message'], 'readonly');
    const messageStore = transaction.objectStore('message');
    const lowerBound = [query.conversation_id, query.from ?? 0];
    const upperBound = [query.conversation_id, query.to ?? 4102419600000];
    const range = IDBKeyRange.bound(lowerBound, upperBound);
    const request = messageStore.index('_id').openCursor(range, 'prev');

    const messages: IVsocStoredMessage[] = [];
    let partialMessage: IVsocStoredMessage | undefined = undefined;

    request.onsuccess = (event) => {
      const cursor: IDBCursorWithValue = (event?.target as any)?.result;
      if (!cursor) {
        resolve(messages);
        return;
      }

      partialMessage = processMessage(cursor.value, messages, partialMessage);

      if (messages.length >= limit) {
        resolve(messages);
        return;
      }
      cursor.continue();
    };
    request.onerror = (e) => reject(e);
  });
};

init();
