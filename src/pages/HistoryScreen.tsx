import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import api from '../api/VsocApi';
import { IVsocStoredConversation } from '../api/VsocTypes';
import moment from 'moment';

function HistoryScreen() {
  const history = useHistory();
  const [conversations, setConversations] = useState<IVsocStoredConversation[]>([]);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    getHistoryConversation();
  }, []);

  const getHistoryConversation = async () => {
    setLoading(true);
    try {
      const data = await api.conversation.listAsync();
      console.log('conversations', data);
      if (data.result) {
        setConversations(data.result);
      }
    } catch (error) {
      console.log('error', error);
    } finally {
      setLoading(false);
    }
  };

  const gotoChat = () => {
    history.push('/');
  };

  return (
    <div id="history-screen" className="container">
      <div id="head-panel" className="head-panel">
        <p className="title-sidepanel">Lịch sử</p>
        <img id="logoIcon" src={require('../assets/images/vSOC-logo.png')} alt="vSOC-logo" />
        <div className="right-btn-row">
          <div className="custom-tooltip" style={{ display: showTooltip ? 'flex' : 'none' }}>
            <div className="content-tooltip">
              <p>Tạo chat mới</p>
            </div>
            <div className="after-tooltip" />
          </div>
          <button
            onClick={gotoChat}
            onMouseEnter={() => {
              setShowTooltip(true);
            }}
            onMouseLeave={() => {
              setShowTooltip(false);
            }}
          >
            <img id="menu-icon" src={require('../assets/images/plus-icon.png')} alt="plus-icon" />
          </button>
        </div>
      </div>
      <div className="body-panel">
        {!loading &&
          (conversations.length > 0 ? (
            <div className="his-chat-panel">
              {conversations.map((item: IVsocStoredConversation) => {
                return (
                  <button
                    className="item-his-view"
                    key={item.id}
                    onClick={() => {
                      history.push('/', item);
                    }}
                  >
                    <p className="title-item-his-view">{item.title}</p>
                    <p>{moment(new Date(item.time)).format('HH:mm, DD/MM/YYYY')}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="no-data-view">
              <img src={require('../assets/images/no-message-icon.png')} alt="no-data"></img>
              <p>Chưa có tin nhắn</p>
              <button onClick={gotoChat}>Chat với vSOC</button>
            </div>
          ))}
      </div>
    </div>
  );
}

export default HistoryScreen;
