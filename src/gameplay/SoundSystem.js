/**
 * A centralized audio manager using the Web Audio API. 
 * It handles loading audio files, managing volume layers (Master vs Music),
 * and playing overlapping sound effects with dynamic pitch shifting. 
 * The implementation of the sound subsystem was developed with the assistance of 
 * Google Gemini. The generated code was reviewed and adapted to fit the structure 
 * and requirements of the project.
 */
export class SoundSystem{
  constructor(){
    // initialize the audio context
    // fallback (webkitAudioContext) for older Safari browsers
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContext();

    // a dictionary to store the loaded, decoded audio files in memory
    this.buffers = {};

    // Create a master volume knob (GainNode) and connect it to the physical speakers
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioCtx.destination);

    // Create a separate volume knob for just music and plug it into the master volume
    // this way, if the master is muted, it mutes both sound effects and music
    this.musicGain = this.audioCtx.createGain();
    this.musicGain.gain.value = 0.3;
    this.musicGain.connect(this.masterGain);
    this.currentMusicSource = null;
  }

  /**
   * Fetches an audio file from the network and decodes it into raw audio data. 
   * By pre-loading buffers, sound effects can be played instantly with zero lag. 
   */
  async loadSound(name, url){
    try{
      // download the raw binary data
      const response = await fetch(url); 
      const arrayBuffer = await response.arrayBuffer();
      // ask the AudioEngine to decode the binary into aplayable AudioBuffer
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      // save it for later use
      this.buffers[name] = audioBuffer;
    }
    catch(error){
      console.error(`Failed to load sound: ${name} at ${url}`, error);
    }
  }

  /**
   * Plays a sound effect 
   * It creates a brand new audio source node every time it is called, allowing
   * multiple of identical sounds (like bullets) to overlap.
   */
  playSound(name, options = {}){
    if(!this.buffers[name]) return; 
    // wake audio engine up if it was suspended
    if(this.audioCtx.state === 'suspended'){
      this.audioCtx.resume();
    }
    // creat a playable source from the save memory buffer
    const source = this.audioCtx.createBufferSource();
    source.buffer = this.buffers[name];
    // create a temporary volume knob just for this specific sound effect
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;

    if(options.pitchVariation){
      const detuneAmount = (Math.random() * 2 - 1) * options.pitchVariation * 100;
      source.detune.value = detuneAmount;
    }

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(0);
  }

  /**
   * Plays a looping background music track.
   * It ensures any currently playing music is stopped before starting a new track
   */
  playMusic(name, volume = 0.3){
    if(!this.buffers[name]) return; 
    if(this.audioCtx.state === 'suspended') this.audioCtx.resume();

    this.stopMusic();
    this.musicGain.gain.value = volume; 
    const source = this.audioCtx.createBufferSource();
    source.buffer = this.buffers[name];
    source.loop = true; 
    source.connect(this.musicGain);
    source.start(0);
    this.currentMusicSource = source;
  }

  /**
   * Stops the current music track
   */
  stopMusic(){
    if(this.currentMusicSource){
      this.currentMusicSource.stop();
      this.currentMusicSource.disconnect();
      this.currentMusicSource = null;
    }
  }

  /**
   * Freezes the entire audio engine
   */
  pauseMusic(){
    if(this.audioCtx.state === "running"){
      this.audioCtx.suspend();
    }
  }

  /**
   * Unfreezes the audio engine
   */
  resumeMusic(){
    if(this.audioCtx.state === "suspended"){
      this.audioCtx.resume();
    }
  }

  /**
   * Global mute toggle
   * Sets the master volume to 0, which instantly silences music and effects
   */
  setSoundEnabled(enabled){
    this.masterGain.gain.value = enabled ? 0.5 : 0;
  }
}