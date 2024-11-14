import { combineReducers, configureStore } from '@reduxjs/toolkit';
import botStatusReducer from './chatSlice';

const combineReducer = combineReducers({ botStatus: botStatusReducer });

const rootReducer = (state: any, action: any) => {
  if (action.type === 'logout') {
    state = undefined;
  }

  return combineReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

// Kiểu của RootState và AppDispatch để sử dụng trong các component
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
