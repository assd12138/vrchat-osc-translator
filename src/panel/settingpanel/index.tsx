import { useAppDispatch, useAppSelector } from "../../store/hook";
import { setBackendUrl, setOpenaiApiUrl, setOscUrl, setOpenaiToken, setOpenaiModel } from "../../store/settings";
import globalStyles from "../../styles/index.module.css";

export default function () {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const handleChangeOsc = (url: string) => {
    dispatch(setOscUrl(url));
  };
  const handleChangeBackend = (url: string) => {
    dispatch(setBackendUrl(url));
  };

  const handleOpenAIApiChange = (url: string) => {
    dispatch(setOpenaiApiUrl(url));
  };

  const handleOpenAITokenChange = (token: string) => {
    dispatch(setOpenaiToken(token));
  };
  const handleOpenAIModelChange = (model: string) => {
    dispatch(setOpenaiModel(model));
  };


  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>⚙️ 系统设置</div>
      <label className={globalStyles.labelS}>OSC地址</label>
      <input
        className={globalStyles.inputS}
        value={settings.osc_url}
        onChange={(e) => handleChangeOsc(e.target.value)}
      />
      <label className={globalStyles.labelS}>后端地址</label>
      <input
        className={globalStyles.inputS}
        value={settings.backend_url}
        onChange={(e) => handleChangeBackend(e.target.value)}
      />
      <label className={globalStyles.labelS}>openai API地址</label>
      <input
        className={globalStyles.inputS}
        value={settings.openai_api_url}
        onChange={(e) => handleOpenAIApiChange(e.target.value)}
      />
      <label className={globalStyles.labelS}>openai token</label>
      <input
        className={globalStyles.inputS}
        value={settings.openai_token}
        onChange={(e) => handleOpenAITokenChange(e.target.value)}
      />
      <label className={globalStyles.labelS}>模型名称</label>
      <input
        className={globalStyles.inputS}
        value={settings.openai_model}
        onChange={(e) => handleOpenAIModelChange(e.target.value)}
      />
    </div>
  );
}
