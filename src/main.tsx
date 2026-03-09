import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import App from "./App";
import store from "./store/store";
import "./store/rehydrate/rehydrate";
// 任何需要读取store的，需要置于rehydrate之后
import "./i18n/index";

const loadResources = () => {
  const loadList = [
    fetch(new URL("./utils/imagecompressor/png.wasm", import.meta.url)),
    import("./utils/imagecompressor/WokerCompress?worker"),
  ];

  return Promise.all(loadList);
};

(async () => {
  await loadResources();
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>,
  );
})();
