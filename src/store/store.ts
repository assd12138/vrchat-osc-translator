import { combineSlices, configureStore } from "@reduxjs/toolkit";
import settingsSlice from "./settings";

const rootReducer = combineSlices(settingsSlice);

const store = configureStore({
	reducer: rootReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export default store;
