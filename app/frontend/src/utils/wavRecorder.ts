/**
 * wavRecorder.ts
 * 
 * Direct PCM WAV Audio Recorder using Web Audio API.
 * Captures raw microphone audio samples at 16,000 Hz (ideal for Groq Whisper)
 * and directly outputs a standard 16-bit mono PCM .wav Blob.
 * 
 * NO MediaRecorder, NO WebM codec bugs, NO decodeAudioData errors.
 * 100% compatible with Groq Whisper & OpenAI Whisper.
 */

export interface WavRecorderResult {
  blob: Blob
  mimeType: string
  durationMs: number
  sampleRate: number
  sizeBytes: number
}

export class WavRecorder {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private analyserNode: AnalyserNode | null = null
  private audioChunks: Float32Array[] = []
  private isRecording = false
  private startTime = 0
  private targetSampleRate = 16000
  private onVolumeChange?: (volume: number, frequencies: number[]) => void

  constructor(onVolumeChange?: (volume: number, frequencies: number[]) => void) {
    this.onVolumeChange = onVolumeChange
  }

  async start(): Promise<void> {
    if (this.isRecording) return

    // 1. Get microphone stream
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    // 2. Setup AudioContext
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    this.audioContext = new AudioCtx()
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    this.audioChunks = []
    this.startTime = Date.now()
    this.isRecording = true

    // 3. Connect nodes: StreamSource -> Analyser -> ScriptProcessor -> Destination
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)
    this.analyserNode = this.audioContext.createAnalyser()
    this.analyserNode.fftSize = 64
    this.analyserNode.smoothingTimeConstant = 0.8

    // ScriptProcessor with 4096 buffer size
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1)

    this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.isRecording) return
      const inputBuffer = e.inputBuffer.getChannelData(0)
      // Make a copy of the samples
      this.audioChunks.push(new Float32Array(inputBuffer))

      // Volume & FFT metrics
      if (this.onVolumeChange && this.analyserNode) {
        const data = new Uint8Array(this.analyserNode.frequencyBinCount)
        this.analyserNode.getByteFrequencyData(data)
        let sum = 0
        const freqs: number[] = []
        for (let i = 0; i < 32; i++) {
          const val = (data[i] || 0) / 255
          freqs.push(val)
          sum += val
        }
        this.onVolumeChange(sum / 32, freqs)
      }
    }

    this.sourceNode.connect(this.analyserNode)
    this.analyserNode.connect(this.processorNode)
    this.processorNode.connect(this.audioContext.destination)
  }

  async stop(): Promise<WavRecorderResult | null> {
    if (!this.isRecording) return null

    this.isRecording = false
    const durationMs = Date.now() - this.startTime

    // Disconnect and clean up Web Audio nodes
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode.onaudioprocess = null
      this.processorNode = null
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    const inputSampleRate = this.audioContext ? this.audioContext.sampleRate : 44100
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close()
      this.audioContext = null
    }

    // Stop mic stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop())
      this.mediaStream = null
    }

    // Flatten all audio chunks into a single Float32Array
    let totalSamples = 0
    for (const chunk of this.audioChunks) {
      totalSamples += chunk.length
    }
    if (totalSamples === 0) return null

    const rawSamples = new Float32Array(totalSamples)
    let offset = 0
    for (const chunk of this.audioChunks) {
      rawSamples.set(chunk, offset)
      offset += chunk.length
    }
    this.audioChunks = []

    // Resample to 16,000 Hz if needed (Whisper standard)
    const resampled = this.resample(rawSamples, inputSampleRate, this.targetSampleRate)

    // Encode to 16-bit PCM WAV Blob
    const wavBlob = this.encodeWav16Bit(resampled, this.targetSampleRate)

    return {
      blob: wavBlob,
      mimeType: 'audio/wav',
      durationMs,
      sampleRate: this.targetSampleRate,
      sizeBytes: wavBlob.size,
    }
  }

  private resample(source: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return source
    const ratio = fromRate / toRate
    const newLength = Math.round(source.length / ratio)
    const result = new Float32Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const srcIdx = i * ratio
      const left = Math.floor(srcIdx)
      const right = Math.min(left + 1, source.length - 1)
      const frac = srcIdx - left
      result[i] = source[left] * (1 - frac) + source[right] * frac
    }
    return result
  }

  private encodeWav16Bit(samples: Float32Array, sampleRate: number): Blob {
    const numChannels = 1
    const bitsPerSample = 16
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
    const blockAlign = (numChannels * bitsPerSample) / 8
    const dataSize = samples.length * blockAlign
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    // RIFF Header
    const writeString = (pos: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos + i, str.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true) // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitsPerSample, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    // PCM 16-bit samples
    let outOffset = 44
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(outOffset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      outOffset += 2
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }
}
