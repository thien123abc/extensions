import api from './api/VsocApi';
import { IChromeMessage, IChromeResponseMessage, IVsocGetSettingResult } from './api/VsocTypes';

let settings: IVsocGetSettingResult[] | undefined = [];

const setupContextMenu = () => {
  chrome.contextMenus.create({
    id: 'vsocSidePanel',
    title: 'vSOC: Mobility Security Operation Center',
    contexts: ['all'],
  });
};

const contextMenus_click = (data: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined) => {
  // Make sure the side panel is open.
  chrome.sidePanel.open({ tabId: tab?.id ?? 0 });
};

const onMessage = (
  message: IChromeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
) => {
  console.log('onMessage', message);
  // The callback for runtime.onMessage must return falsy if we're not sending a response
  let result: IChromeResponseMessage | undefined = undefined;
  if (message.type === 'open_side_panel') {
    result = handleOpenSidePanel(sender.tab?.id ?? 0);
  } else if (message.type === 'get_settings') {
    result = handleGetSettings();
  } else if (message.type === 'monitored_content') {
    result = handleMonitoredContent(message.text);
  }

  result ??= {
    error: true,
    errorMessage: 'unknown type ' + message.type,
  };
  result.type ??= 'response_' + message.type;

  sendResponse(result);
};

const handleOpenSidePanel = (tabId: number): IChromeResponseMessage => {
  try {
    chrome.sidePanel.open({ tabId: tabId });
    return {
      error: false,
    };
  } catch (ex) {
    console.error(ex);
    return {
      error: true,
    };
  }
};

const handleGetSettings = (): IChromeResponseMessage => {
  return {
    error: false,
    value: settings,
  };
};

const handleMonitoredContent = (text: string): IChromeResponseMessage => {
  try {
    const msg: IChromeMessage = {
      type: 'text_from_monitor',
      text,
    };
    console.log('chrome.runtime.sendMessage', msg);
    chrome.runtime.sendMessage(msg);
    return {
      error: false,
    };
  } catch (ex) {
    console.error(ex);
    return {
      error: true,
    };
  }
};

const initAsync = async () => {
  chrome.runtime.onInstalled.addListener(setupContextMenu);
  chrome.contextMenus.onClicked.addListener(contextMenus_click);
  chrome.runtime.onMessage.addListener(onMessage);

  const response = await api.setting.getAsync();
  settings = response.result;
};

initAsync();
