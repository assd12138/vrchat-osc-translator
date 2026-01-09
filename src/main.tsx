import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App";
import store from "./store/store";
import { rehydrate } from "./store/rehydrate/rehydrate";

// 重新水合持久化
rehydrate()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
