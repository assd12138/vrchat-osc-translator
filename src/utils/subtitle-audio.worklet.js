// 此文件由 AudioWorklet 独立加载，不在页面主线程中执行。
class SubtitleAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.chunkFrames = options.processorOptions.chunkFrames;
    this.pcm = new ArrayBuffer(this.chunkFrames * 2);
    this.view = new DataView(this.pcm);
    this.offset = 0;
    this.sumSquares = 0;
    this.peak = 0;
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0) return true;

    for (let frame = 0; frame < channels[0].length; frame++) {
      let sample = 0;
      for (const channel of channels) sample += channel[frame];
      sample = Math.max(-1, Math.min(1, sample / channels.length));
      this.view.setInt16(
        this.offset * 2,
        Math.round(sample * (sample < 0 ? 32768 : 32767)),
        true,
      );
      this.offset++;
      this.sumSquares += sample * sample;
      this.peak = Math.max(this.peak, Math.abs(sample));

      if (this.offset === this.chunkFrames) {
        this.port.postMessage(
          {
            pcm: this.pcm,
            rms: Math.sqrt(this.sumSquares / this.chunkFrames),
            peak: this.peak,
          },
          [this.pcm],
        );
        this.pcm = new ArrayBuffer(this.chunkFrames * 2);
        this.view = new DataView(this.pcm);
        this.offset = 0;
        this.sumSquares = 0;
        this.peak = 0;
      }
    }
    // 不向 outputs 写入音频，保持静音，避免将系统声音重复播放。
    return true;
  }
}

registerProcessor("subtitle-audio-processor", SubtitleAudioProcessor);
