import { combineReducers, configureStore } from '@reduxjs/toolkit';

const combineReducer = combineReducers({});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'logout') {
    state = undefined;
  }

  return combineReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});
