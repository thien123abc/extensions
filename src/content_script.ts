import {
  IChromeGetSettingsMessageResult,
  IChromeMessage,
  IChromeResponseMessage,
  IVsocMonitorSetting,
  IVsocSetting,
} from './api/VsocTypes';
import './assets/css/content_script.scss';

let arrMonitorInfo: IVsocMonitorSetting[] | undefined = undefined;
const recentContents: Record<string, string> = {};
(window as any).recentContents = recentContents;

const sleepAsync = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

const startMonitor = (setting: IVsocSetting) => {
  arrMonitorInfo = setting.monitor;
  doMonitor();
};

const doMonitor = async () => {
  try {
    if (!arrMonitorInfo) return;

    const monitorInfo = arrMonitorInfo.find((info) =>
      (location.pathname + location.search).match(new RegExp(info.pathPattern)),
    );
    if (!monitorInfo) return;

    const injectedDomHolder = document.querySelector(monitorInfo.injectedDomPath) as HTMLElement;

    const dom = document.querySelector(monitorInfo.contentDomPath) as HTMLElement;
    if (!dom) {
      const injectedDom = injectedDomHolder?.querySelector('.vsoc-injected-button');
      recentContents[monitorInfo.contentDomPath] = '';
      if (injectedDom) injectedDom.remove();
      return;
    }

    const text = dom.innerText.trim();
    if (!text || recentContents[monitorInfo.contentDomPath] === text) {
      return;
    }

    if (!injectedDomHolder) {
      return;
    }
    let injectedDom = injectedDomHolder.querySelector('.vsoc-injected-button') as HTMLAnchorElement;
    if (!injectedDom) {
      injectedDom = document.createElement('a');
      injectedDom.className = 'vsoc-injected-button';
      injectedDom.dataset.text = text;
      injectedDom.onclick = async () => {
        if (injectedDom.classList.contains('processing')) return;
        injectedDom.classList.add('processing');
        try {
          await openSidePanelAsync();
          await sleepAsync(200);
          await sendMonitoredContentAsync('Phân tích và xử lý cảnh báo sau: ' + injectedDom.dataset.text);
          injectedDom.remove();
        } finally {
          injectedDom.classList.remove('processing');
        }
      };
      injectedDomHolder.appendChild(injectedDom);
    } else {
      injectedDom.dataset.text = text;
    }

    recentContents[monitorInfo.contentDomPath] = text;
  } finally {
    setTimeout(doMonitor, 1000);
  }
};

const sendMessageToServiceWorkerAsync = async (message: IChromeMessage): Promise<IChromeMessage> => {
  const responseMessage = await chrome.runtime.sendMessage(message);
  return responseMessage;
};

const getSettingsAsync = () =>
  sendMessageToServiceWorkerAsync({ type: 'get_settings' }) as Promise<IChromeGetSettingsMessageResult>;
const openSidePanelAsync = () =>
  sendMessageToServiceWorkerAsync({ type: 'open_side_panel' }) as Promise<IChromeResponseMessage>;
const sendMonitoredContentAsync = (text: string) =>
  sendMessageToServiceWorkerAsync({ type: 'monitored_content', text }) as Promise<IChromeResponseMessage>;

window.addEventListener('load', async () => {
  try {
    const response = await getSettingsAsync();
    const setting = response?.value?.find((setting) => setting.domain == location.host);
    if (setting) {
      startMonitor(setting);
    }
  } catch (e) {
    console.log(e);
  }
});
