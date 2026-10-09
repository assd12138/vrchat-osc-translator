export interface ScreenPickerSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
  appIconDataUrl: string;
}

export interface ScreenPickerData {
  sources: ScreenPickerSource[];
  audioRequested: boolean;
}

export interface ScreenPickerSelection {
  id: string;
  shareAudio: boolean;
}
