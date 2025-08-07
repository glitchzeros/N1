import { System } from '@/engine/core/ecs/System';
import { TransformComponent } from '@/engine/core/ecs/components/TransformComponent';
import { World } from '@/engine/core/ecs/World';
import { Howl, Howler } from 'howler';
import { Vector3 } from '@/engine/core/math/Vector3';

export interface AudioClip {
  id: string;
  src: string;
  volume: number;
  loop: boolean;
  spatial: boolean;
  maxDistance: number;
}

export class AudioComponent {
  clips: Map<string, AudioClip> = new Map();
  currentSounds: Map<string, Howl> = new Map();
  masterVolume: number = 1.0;
  spatialEnabled: boolean = true;

  constructor() {
    this.initializeClips();
  }

  private initializeClips(): void {
    // Weapon sounds
    this.clips.set('pistol_fire', {
      id: 'pistol_fire',
      src: '/audio/weapons/pistol_fire.mp3',
      volume: 0.8,
      loop: false,
      spatial: true,
      maxDistance: 100
    });

    this.clips.set('rifle_fire', {
      id: 'rifle_fire',
      src: '/audio/weapons/rifle_fire.mp3',
      volume: 0.9,
      loop: false,
      spatial: true,
      maxDistance: 150
    });

    this.clips.set('shotgun_fire', {
      id: 'shotgun_fire',
      src: '/audio/weapons/shotgun_fire.mp3',
      volume: 1.0,
      loop: false,
      spatial: true,
      maxDistance: 80
    });

    // Footsteps
    this.clips.set('footstep', {
      id: 'footstep',
      src: '/audio/footsteps/footstep.mp3',
      volume: 0.3,
      loop: false,
      spatial: true,
      maxDistance: 20
    });

    // Ambient sounds
    this.clips.set('ambient_wind', {
      id: 'ambient_wind',
      src: '/audio/ambient/wind.mp3',
      volume: 0.2,
      loop: true,
      spatial: false,
      maxDistance: 0
    });

    this.clips.set('ambient_birds', {
      id: 'ambient_birds',
      src: '/audio/ambient/birds.mp3',
      volume: 0.1,
      loop: true,
      spatial: false,
      maxDistance: 0
    });
  }

  play(clipId: string, position?: { x: number; y: number; z: number }): void {
    const clip = this.clips.get(clipId);
    if (!clip) return;

    // For now, use placeholder sounds since we don't have actual audio files
    // In a real implementation, this would load and play the actual audio files
    console.log(`Playing audio: ${clipId} at position:`, position);
    
    // Create a mock Howl instance for demonstration
    const mockSound = {
      play: () => console.log(`Mock playing: ${clipId}`),
      stop: () => console.log(`Mock stopping: ${clipId}`),
      volume: (vol: number) => console.log(`Mock volume: ${clipId} = ${vol}`),
      pos: (x: number, y: number, z: number) => console.log(`Mock position: ${clipId} = (${x}, ${y}, ${z})`),
    } as any;

    this.currentSounds.set(clipId, mockSound);
    
    if (clip.spatial && position) {
      // Calculate spatial audio properties
      const distance = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
      const volume = Math.max(0, 1 - distance / clip.maxDistance) * clip.volume * this.masterVolume;
      
      mockSound.volume(volume);
      mockSound.pos(position.x, position.y, position.z);
    } else {
      mockSound.volume(clip.volume * this.masterVolume);
    }

    mockSound.play();
  }

  stop(clipId: string): void {
    const sound = this.currentSounds.get(clipId);
    if (sound) {
      sound.stop();
      this.currentSounds.delete(clipId);
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  toJSON() {
    return {
      masterVolume: this.masterVolume,
      spatialEnabled: this.spatialEnabled,
    };
  }

  fromJSON(json: any) {
    this.masterVolume = json.masterVolume;
    this.spatialEnabled = json.spatialEnabled;
  }
}

export class AudioSystem extends System {
  private listenerPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private ambientSounds: Map<string, Howl> = new Map();

  constructor() {
    super('AudioSystem', 'low', { all: ['AudioComponent'] });
    this.initializeAmbientAudio();
  }

  private initializeAmbientAudio(): void {
    // Start ambient sounds
    const ambientAudio = new AudioComponent();
    ambientAudio.play('ambient_wind');
    ambientAudio.play('ambient_birds');
  }

  protected onUpdate(deltaTime: number): void {
    const world = (this as any).world as World;

    // Update listener position (camera position)
    // This would be updated from the camera system
    // For now, use a fixed position

    for (const entityId of this.entities) {
      const transform = world.getComponent<TransformComponent>(entityId, 'TransformComponent');
      const audio = world.getComponent<AudioComponent>(entityId, 'AudioComponent');
      
      if (!transform || !audio) continue;

      // Update spatial audio for this entity
      this.updateSpatialAudio(transform, audio);
    }
  }

  private updateSpatialAudio(transform: TransformComponent, audio: AudioComponent): void {
    // Update spatial properties for all active sounds
    for (const [clipId, sound] of audio.currentSounds) {
      const clip = audio.clips.get(clipId);
      if (!clip || !clip.spatial) continue;

      const distance = transform.position.distance(new Vector3(
        this.listenerPosition.x,
        this.listenerPosition.y,
        this.listenerPosition.z
      ));

      const volume = Math.max(0, 1 - distance / clip.maxDistance) * clip.volume * audio.masterVolume;
      sound.volume(volume);

      // Update 3D position
      const relativePos = transform.position.clone().sub(new Vector3(
        this.listenerPosition.x,
        this.listenerPosition.y,
        this.listenerPosition.z
      ));
      
      sound.pos(relativePos.x, relativePos.y, relativePos.z);
    }
  }

  setListenerPosition(position: { x: number; y: number; z: number }): void {
    this.listenerPosition = position;
  }

  // Global audio controls
  pauseAll(): void {
    Howler.ctx?.suspend();
  }

  resumeAll(): void {
    Howler.ctx?.resume();
  }

  setGlobalVolume(volume: number): void {
    Howler.volume(Math.max(0, Math.min(1, volume)));
  }
}