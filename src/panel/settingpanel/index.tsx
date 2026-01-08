import { useAppDispatch, useAppSelector } from "../../store/hook";
import { setBackendUrl, setOscUrl } from "../../store/settings";
import globalStyles from "../../styles/index.module.css";

export default function () {
  const settings = useAppSelector(state => state.settings)
  const dispatch = useAppDispatch()
  const handleChangeOsc = (url: string) => {
    dispatch(setOscUrl(url))
  }
  const handleChangeBackend = (url: string) => {
    dispatch(setBackendUrl(url))
  }
  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>⚙️ 系统设置</div>
      <label className={globalStyles.labelS}>OSC地址</label>
      <input className={globalStyles.inputS} value={settings.osc_url} onChange={e => handleChangeOsc(e.target.value)} />
      <label className={globalStyles.labelS}>后端地址</label>
      <input className={globalStyles.inputS} value={settings.backend_url} onChange={e => handleChangeBackend(e.target.value)} />
    </div>
  );
}
