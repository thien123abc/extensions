interface UseFormattedTimeProps {
  lastUsedTime: number; // thời gian tính từ epoch ml second
}

export const formattedTime = ({ lastUsedTime }: UseFormattedTimeProps): string => {
  const formatDate = (lastUsedTime: number): string => {
    const now = new Date();
    const lastUsedDate = new Date(lastUsedTime);

    // Tính khoảng thời gian hiện tại và thời gian gửi tin nhắn
    const diffInMilliseconds = now.getTime() - lastUsedDate.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    // const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths =
      now.getMonth() - lastUsedDate.getMonth() + 12 * (now.getFullYear() - lastUsedDate.getFullYear());

    // Kiểm tra xem thời gian gửi có phải là trong ngày hôm nay không
    const isToday =
      now.getFullYear() === lastUsedDate.getFullYear() &&
      now.getMonth() === lastUsedDate.getMonth() &&
      now.getDate() === lastUsedDate.getDate();

    // Tin nhắn gửi trong ngày
    if (diffInDays < 1 && isToday) {
      if (diffInMinutes < 1) {
        return 'Vừa xong';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} phút`;
      } else {
        const hours = lastUsedDate.getHours();
        const minutes = lastUsedDate.getMinutes();
        return `${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
      }
    }

    // Tin nhắn gửi trong 1 tuần
    if (diffInDays < 7 && !isToday) {
      const daysOfWeek = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
      return daysOfWeek[lastUsedDate.getDay()]; // Hiển thị thứ trong tuần
    }

    // Tin nhắn gửi trong cùng tháng nhưng cách hơn một tuần
    // Tin nhắn gửi cách hơn một tuần nhưng khác tháng
    // Tin nhắn gửi trong các tháng trước trong cùng năm
    // const currentMonth = now.getMonth();
    const lastUsedMonth = lastUsedDate.getMonth();
    if (now.getFullYear() === lastUsedDate.getFullYear()) {
      const day = lastUsedDate.getDate();
      const month = lastUsedMonth + 1;
      return `${day} tháng ${month}`;
    }

    // Tin nhắn gửi trong các tháng trước trong cùng năm
    // const currentYear = now.getFullYear();
    // const lastUsedYear = lastUsedDate.getFullYear();
    // if (currentYear === lastUsedYear && diffInMonths > 1) {
    //   const day = lastUsedDate.getDate();
    //   const month = lastUsedDate.getMonth() + 1;
    //   return `${day} tháng ${month}`;
    // }

    // Tin nhắn gửi trong các năm trước
    const year = lastUsedDate.getFullYear();
    const day = lastUsedDate.getDate();
    const month = lastUsedDate.getMonth() + 1;
    return `${day} tháng ${month}, ${year}`;
  };

  return formatDate(lastUsedTime);
};
