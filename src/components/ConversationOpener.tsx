import { useEffect, useState } from 'react';
import SecAGILoGo from '../assets/icons/SecAGI.svg';
import { getParametersAsync } from '../api/eventSource';
import { IVsocParametersResponse, IVsocParametersResponseWithComplexQuestions } from '../api/VsocTypes';

interface IVsocOpenerProps {
  onClick: (arg: { text: string; isComplex: boolean }) => void;
}

function ConversationOpener({ onClick }: IVsocOpenerProps) {
  const [isOpener, setIsOpener] = useState(false);
  const [dataOpener, setDataOpener] = useState<IVsocParametersResponseWithComplexQuestions>();
  useEffect(() => {
    getParametersAsync().then((res) => {
      // const response=res.result as IVsocParametersResponse
      const response: IVsocParametersResponse = {
        opening_statement: res.result?.opening_statement || '',
        suggested_questions: [
          ...(res.result as IVsocParametersResponse).suggested_questions,
          'Phân tích cảnh báo <cảnh báo 1> và bảo mật <bảo mật 1> <bảo mật 2> và <bảo mật 3>',
        ],
        suggested_questions_after_answer: {
          enabled: Boolean(res.result?.suggested_questions_after_answer),
        },
      };
      const parseRes = response.suggested_questions.map((item) => {
        // Kiểm tra xem câu có chứa <text> không
        const isComplex = /<.*?>/.test(item);
        if (isComplex) {
          // Thay thế tất cả các cụm <text> bằng dấu "..."
          item = item.replace(/<.*?>/g, '...');
        }
        return {
          text: item, // Nội dung câu
          isComplex: isComplex, // Đánh dấu có phải câu phức tạp không
        };
      });
      setDataOpener({
        opening_statement: response.opening_statement,
        suggested_questions: parseRes,
        suggested_questions_after_answer: response.suggested_questions_after_answer,
      });
      setIsOpener((res.result as IVsocParametersResponse).suggested_questions_after_answer.enabled);
    });
  }, []);

  const handleClick = (item: { text: string; isComplex: boolean }) => {
    onClick(item);
  };

  if (!isOpener) return null;
  return (
    <div className="opener">
      <div className="header-opener">
        <img src={SecAGILoGo} alt="secagi-logo" />
        <p>SecAGI</p>
      </div>
      {dataOpener && (
        <div className="content-opener">
          <p className="title-content">{dataOpener.opening_statement}</p>
          <div className="list-item-content">
            {dataOpener?.suggested_questions.length &&
              dataOpener.suggested_questions.map((item, index) => (
                <div className="item-content" key={index} onClick={() => handleClick(item)}>
                  {item.text}
                </div>
              ))}
            {/* <div className="item-content">Plan a relaxing day</div>
            <div className="item-content">
              Superhero shark story Trends for News & Insights of Vulnerability A B c d Trends for News & Insights of
              Vulnerability
            </div>
            <div className="item-content">Design a fun coding game</div>
            <div className="item-content">Phân tích cảnh báo ...</div> */}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConversationOpener;
