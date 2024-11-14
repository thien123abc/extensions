import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export enum BotRunStatusEnum {
  FINISHED_RUNNING = 'finished_running',
  RUNNING = 'running',
}
// Định nghĩa kiểu cho trạng thái bot
interface BotStatusState {
  isBotRunStatus: BotRunStatusEnum;
}
const initialState: BotStatusState = {
  isBotRunStatus: BotRunStatusEnum.FINISHED_RUNNING, // Mặc định là bot chạy xong
};

const botStatusSlice = createSlice({
  name: 'botStatus',
  initialState,
  reducers: {
    setBotRunStatus: (state, action: PayloadAction<BotRunStatusEnum>) => {
      state.isBotRunStatus = action.payload; // Cập nhật trạng thái bot
    },
  },
});

export const { setBotRunStatus } = botStatusSlice.actions;

export default botStatusSlice.reducer;
