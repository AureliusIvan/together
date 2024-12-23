// src/scenes/Game.ts
import {Scene} from 'phaser'
import {EventBus} from '@/components/game/EventBus'
import {Avatar} from '@/components/game/avatar/Avatar'
import {ObstacleManager} from '@/components/game/object/ObstacleManager'
import {io, Socket} from 'socket.io-client'


export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera | undefined
  background: Phaser.GameObjects.Image | undefined
  avatar: Avatar | undefined
  obstacleManager: ObstacleManager | undefined
  otherAvatars: { [id: string]: Avatar } = {}  // Store other players' avatars
  socket: Socket | undefined  // Socket.IO client
  private readonly playerId: string | null

  constructor() {
    super('Game')
    this.playerId = localStorage.getItem('username')
  }

  create() {
    // Initialize the Socket.IO client and listen for updates
    this.socket = io(process.env.NEXT_PUBLIC_BACKEND_URI) // Replace with your server URL

    // Set up camera and background
    this.camera = this.cameras.main

    // Add the background image and adjust its position and scale to cover the screen
    this.background = this.add.image(
        this.scale.width / 2,
        this.scale.height / 2,
        'background'
    ).setOrigin(0.5, 0.5)

    // Calculate the scale to cover the entire screen
    const scaleX = this.scale.width / this.background.width
    const scaleY = this.scale.height / this.background.height
    const scale = Math.max(scaleX, scaleY)
    this.background.setScale(scale)

    // Create the avatar and add it to the scene
    this.avatar = new Avatar(this, 512, 384, this.playerId!)
    this.avatar.create()

    // Set camera to follow avatar and zoom in
    this.camera.setZoom(4)
    this.camera.startFollow(this.avatar.sprite!)
    this.camera.setBounds(0, 0, this.background.width, this.background.height)
    this.camera.fadeIn(1000)

    // Initialize the ObstacleManager and create obstacles
    this.obstacleManager = new ObstacleManager(this)
    this.obstacleManager.createObstacles()

    // Add collision between avatar and obstacles
    this.physics.add.collider(
        this.avatar.sprite!,
        this.obstacleManager.getObstacles()
    )

    // Listen for position updates from other players
    this.socket.on('playerMoved',
        (player: { id: string, position: { x: number, y: number } }
        ) => {
          if (player.id && player.position) {
            if (!this.otherAvatars[player.id]) {
              console.log("New player joined:", player);
              const newAvatar = new Avatar(this, player.position.x, player.position.y, player.id);
              newAvatar.create();
              this.otherAvatars[player.id] = newAvatar;
            } else {
              const playerAvatar = this.otherAvatars[player.id];
              playerAvatar.sprite?.setPosition(player.position.x, player.position.y);
            }
          } else {
            console.warn("Received invalid player data:", player);
          }
        });

    // Listen for the 'players' event to handle the initial list of players
    this.socket.on('players', (players: Array<{ id: string, position: { x: number, y: number } }>) => {
      const validPlayers = players.filter(player => player.id && player.position);

      validPlayers.forEach(player => {
        // Skip the avatar update for the current player's own avatar
        if (player.id === this.playerId) {
          return; // Do nothing if the player is the same as the local player
        }

        if (!this.otherAvatars[player.id]) {
          const newAvatar = new Avatar(this, player.position.x, player.position.y, player.id);
          newAvatar.create();
          this.otherAvatars[player.id] = newAvatar;
        } else {
          const playerAvatar = this.otherAvatars[player.id];
          playerAvatar.sprite?.setPosition(player.position.x, player.position.y);
        }
      });

      // Enable debug for physics world, rendering collider shapes (bodies, etc.)
      this.physics.world.createDebugGraphic();
      this.physics.world.debugGraphic?.lineStyle(1, 0x00ff00);
      this.physics.world.debugGraphic?.strokeRect(0, 0, this.scale.width, this.scale.height);
    });


    // Emit the current player's position when the game starts
    this.socket.emit('move', {
      playerId: this.playerId,
      position: {x: this.avatar.sprite?.x, y: this.avatar.sprite?.y}
    });

    EventBus.emit('current-scene-ready', this)
  }

  update() {
    if (this.avatar) {
      this.avatar.update()
    }
  }
}
