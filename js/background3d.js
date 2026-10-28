/**
 * VoiceParty 3D Background Engine — Three.js WebGL
 *
 * Renderiza a malha acústica deformável em tempo real e o orbe de sinapses neurais.
 * Projetado para fluidez de 60 FPS com baixo consumo de CPU/GPU.
 *
 * Contratos de Interface:
 * - window.WaveformScene = { init, onSlideChange, resize, destroy, getInstance }
 * - window.VoicePartyBackground = VoicePartyBackground
 */

(function (root) {
  'use strict';

  class VoicePartyBackground {
    constructor(canvasId = 'canvas-bg') {
      this.canvasId = canvasId;
      this.canvas = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.waveMesh = null;
      this.neuralGroup = null;
      this.points = null;
      this.lines = null;
      this.ambientLight = null;
      this.pointLight = null;
      this.animId = null;
      this.clock = null;
      this.isPaused = false;
      this.isInitialized = false;

      // Preferência por Movimento Reduzido (Acessibilidade WCAG 2.1)
      this.prefersReducedMotion = false;
      this.motionMediaQuery = null;

      // Parâmetros de navegação e cinemática (alvos para LERP)
      this.currentSlideIndex = 0;
      this.targetCameraY = 4;
      this.targetCameraZ = 35;
      this.targetOrbX = 14;
      this.targetOrbY = 4;
      this.targetOrbScale = 1.0;
      this.waveSpeed = 1.0;
      this.waveAmplitude = 1.2;

      // Definições de parâmetros para cada um dos 8 slides da apresentação
      this.slideProfiles = [
        { camY: 4.0, camZ: 35.0, orbX: 14.0, orbY: 4.0, orbScale: 1.0, amp: 1.2, spd: 1.0 }, // 0: Abertura
        { camY: 2.5, camZ: 32.0, orbX: 10.0, orbY: 3.5, orbScale: 1.1, amp: 0.9, spd: 0.8 }, // 1: Redes Neurais
        { camY: 5.5, camZ: 38.0, orbX: 16.0, orbY: 5.0, orbScale: 1.2, amp: 1.8, spd: 1.4 }, // 2: Representação Sonora
        { camY: 3.0, camZ: 34.0, orbX: 12.0, orbY: 3.8, orbScale: 1.0, amp: 1.1, spd: 1.1 }, // 3: Librosa & Tratamento
        { camY: 2.0, camZ: 30.0, orbX: 8.0,  orbY: 2.5, orbScale: 1.3, amp: 1.4, spd: 1.3 }, // 4: CRNN & Treinamento
        { camY: 6.0, camZ: 36.0, orbX: 15.0, orbY: 5.5, orbScale: 1.4, amp: 2.2, spd: 1.6 }, // 5: Demonstração VoiceParty
        { camY: 3.5, camZ: 34.0, orbX: 11.0, orbY: 3.5, orbScale: 0.9, amp: 0.8, spd: 0.7 }, // 6: Limitações & Ética
        { camY: 4.0, camZ: 35.0, orbX: 14.0, orbY: 4.0, orbScale: 1.0, amp: 1.2, spd: 0.9 }  // 7: Encerramento
      ];

      // Handlers vinculados para limpeza limpa
      this._boundResize = this.onResize.bind(this);
      this._boundVisibility = this.onVisibilityChange.bind(this);
      this._boundMotionQuery = this.onMotionPreferenceChange.bind(this);
    }

    /**
     * Inicializa o contexto WebGL e constrói os elementos 3D.
     */
    init(targetCanvas) {
      if (this.isInitialized) return this;

      if (typeof THREE === 'undefined') {
        console.warn('[VoicePartyBackground] Biblioteca Three.js ainda não carregada no escopo global. Aguardando...');
        return this;
      }

      this.canvas = targetCanvas || document.getElementById(this.canvasId);
      if (!this.canvas) {
        // Cria dinamicamente o canvas se não existir no DOM
        this.canvas = document.createElement('canvas');
        this.canvas.id = this.canvasId;
        this.canvas.className = 'world';
        this.canvas.style.position = 'fixed';
        this.canvas.style.inset = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '0';
        document.body.insertBefore(this.canvas, document.body.firstChild);
      }

      // 1. Cena e Efeito de Nevoeiro Cósmico
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x03050c, 0.022);
      this.clock = new THREE.Clock();

      // 2. Câmera Perspectiva
      const aspect = (window.innerWidth || 1920) / (window.innerHeight || 1080);
      this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
      this.camera.position.set(0, this.targetCameraY, this.targetCameraZ);

      // 3. Renderer com Otimização de Performance e Bateria
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      // Limitar pixelRatio ao teto de 1.5 para economia de GPU em telas 4K/Retina
      const safePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      this.renderer.setPixelRatio(safePixelRatio);

      // 4. Detecção de Preferência de Movimento Reduzido (WCAG 2.1)
      if (typeof window !== 'undefined' && window.matchMedia) {
        this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.prefersReducedMotion = this.motionMediaQuery.matches;
        if (typeof this.motionMediaQuery.addEventListener === 'function') {
          this.motionMediaQuery.addEventListener('change', this._boundMotionQuery);
        } else if (typeof this.motionMediaQuery.addListener === 'function') {
          this.motionMediaQuery.addListener(this._boundMotionQuery);
        }
      }

      // 5. Criação dos Componentes Visuais
      this.createAudioWaveformMesh();
      this.createNeuralOrb();
      this.setupLighting();

      // 6. Registro de Listeners de Eventos
      window.addEventListener('resize', this._boundResize);
      document.addEventListener('visibilitychange', this._boundVisibility);

      this.isInitialized = true;

      // Se a aba carregar em background ou o usuário preferir movimento reduzido,
      // não inicia o loop perpétuo de requestAnimationFrame
      if (typeof document !== 'undefined' && document.hidden) {
        this.isPaused = true;
        this.renderFrame();
      } else if (this.prefersReducedMotion) {
        this.isPaused = false;
        this.renderFrame();
      } else {
        this.isPaused = false;
        this.animate();
      }

      return this;
    }

    /**
     * Constrói a malha de ondas sonoras planares deformáveis.
     * Densidade geométrica adaptativa para GPUs integradas e dispositivos móveis.
     */
    createAudioWaveformMesh() {
      // Ajusta densidade de subdivisões para economia de ciclos de CPU/GPU
      const isMobile = (typeof window !== 'undefined' && window.innerWidth < 768);
      const segmentsX = isMobile ? 36 : 48;
      const segmentsY = isMobile ? 24 : 32;

      // Plano estendido cobrindo o horizonte inferior
      const geometry = new THREE.PlaneGeometry(74, 54, segmentsX, segmentsY);
      geometry.rotateX(-Math.PI / 2.5);
      geometry.translate(0, -6.5, -4);

      // Guardar posições originais para cálculo senoidal de harmônicos
      const pos = geometry.attributes.position;
      geometry.userData.originalPositions = new Float32Array(pos.array);

      const material = new THREE.MeshBasicMaterial({
        color: 0x4aa8ff,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending
      });

      this.waveMesh = new THREE.Mesh(geometry, material);
      this.scene.add(this.waveMesh);
    }

    /**
     * Constrói o orbe neural pulsante (partículas sinápticas + arestas conectadas).
     */
    createNeuralOrb() {
      this.neuralGroup = new THREE.Group();
      this.neuralGroup.position.set(this.targetOrbX, this.targetOrbY, -8);

      const icoGeom = new THREE.IcosahedronGeometry(6.5, 2);

      // Partículas nos vértices (Nós Neurais)
      const pointsMat = new THREE.PointsMaterial({
        color: 0xffb347,
        size: 0.38,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending
      });
      this.points = new THREE.Points(icoGeom, pointsMat);
      this.neuralGroup.add(this.points);

      // Arestas estruturais (Sinapses Transmissoras)
      const wireGeom = new THREE.WireframeGeometry(icoGeom);
      const linesMat = new THREE.LineBasicMaterial({
        color: 0x4aa8ff,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending
      });
      this.lines = new THREE.LineSegments(wireGeom, linesMat);
      this.neuralGroup.add(this.lines);

      this.scene.add(this.neuralGroup);
    }

    /**
     * Configura iluminação ambiente e pontual para realce sutil.
     */
    setupLighting() {
      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      this.scene.add(this.ambientLight);

      this.pointLight = new THREE.PointLight(0xffb347, 1.4, 60);
      this.pointLight.position.set(12, 10, 8);
      this.scene.add(this.pointLight);
    }

    /**
     * Interpola suavemente a dinâmica 3D ao mudar de slide.
     * @param {number} slideIndex - Índice do slide (0 a 7).
     */
    onSlideChange(slideIndex) {
      this.currentSlideIndex = slideIndex;
      const profile = this.slideProfiles[slideIndex] || this.slideProfiles[0];

      this.targetCameraY = profile.camY;
      this.targetCameraZ = profile.camZ;
      this.targetOrbX = profile.orbX;
      this.targetOrbY = profile.orbY;
      this.targetOrbScale = profile.orbScale;
      this.waveAmplitude = profile.amp;
      this.waveSpeed = profile.spd;

      // Se o usuário preferir movimento reduzido, ajusta posições sem interpolação contínua
      if (this.prefersReducedMotion && this.isInitialized) {
        if (this.camera) {
          this.camera.position.y = this.targetCameraY;
          this.camera.position.z = this.targetCameraZ;
        }
        if (this.neuralGroup) {
          this.neuralGroup.position.x = this.targetOrbX;
          this.neuralGroup.position.y = this.targetOrbY;
          this.neuralGroup.scale.set(this.targetOrbScale, this.targetOrbScale, this.targetOrbScale);
        }
        this.renderFrame();
      }
    }

    /**
     * Reação a redimensionamento de janela mantendo aspecto e nitidez.
     */
    onResize() {
      if (!this.camera || !this.renderer) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      const safePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      this.renderer.setPixelRatio(safePixelRatio);

      if (this.prefersReducedMotion || this.isPaused) {
        this.renderFrame();
      }
    }

    /**
     * Pausa o loop de animação quando a aba perde o foco/visibilidade.
     */
    onVisibilityChange() {
      if (document.hidden) {
        this.isPaused = true;
        if (this.animId) {
          cancelAnimationFrame(this.animId);
          this.animId = null;
        }
      } else {
        if (this.isPaused) {
          this.isPaused = false;
          if (this.clock) this.clock.getDelta(); // Evita salto brusco no delta
          if (this.prefersReducedMotion) {
            this.renderFrame();
          } else {
            this.animate();
          }
        }
      }
    }

    /**
     * Reage dinamicamente a mudanças nas configurações de acessibilidade do SO.
     */
    onMotionPreferenceChange(e) {
      this.prefersReducedMotion = !!(e && e.matches);
      if (this.prefersReducedMotion) {
        if (this.animId) {
          cancelAnimationFrame(this.animId);
          this.animId = null;
        }
        this.renderFrame();
      } else {
        if (!this.isPaused && (typeof document === 'undefined' || !document.hidden) && this.isInitialized) {
          this.animate();
        }
      }
    }

    /**
     * Renderiza um quadro estático único (usado em pausa e movimento reduzido).
     */
    renderFrame() {
      if (!this.renderer || !this.scene || !this.camera) return;
      this.renderer.render(this.scene, this.camera);
    }

    /**
     * Loop principal de renderização a 60 FPS com LERP e deformações harmônicas.
     */
    animate() {
      if (this.isPaused || !this.isInitialized || this.prefersReducedMotion) return;

      this.animId = requestAnimationFrame(this.animate.bind(this));

      const delta = this.clock ? this.clock.getDelta() : 0.016;
      const elapsed = this.clock ? this.clock.getElapsedTime() : 0;

      // 1. Interpolação suave da câmera (LERP a 4.5% por frame)
      this.camera.position.y += (this.targetCameraY - this.camera.position.y) * 0.045;
      this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * 0.045;

      // 2. Translação e Rotação do Orbe Neural
      if (this.neuralGroup) {
        this.neuralGroup.position.x += (this.targetOrbX - this.neuralGroup.position.x) * 0.04;
        this.neuralGroup.position.y += (this.targetOrbY - this.neuralGroup.position.y) * 0.04;

        // Pulsação sutil na escala
        const pulse = 1.0 + Math.sin(elapsed * 2.4) * 0.05;
        const currentScale = this.targetOrbScale * pulse;
        this.neuralGroup.scale.set(currentScale, currentScale, currentScale);

        this.neuralGroup.rotation.y += 0.0035;
        this.neuralGroup.rotation.x += 0.0018;
      }

      // 3. Deformação ondulatória da malha simulando harmônicos de voz humana
      if (this.waveMesh) {
        const pos = this.waveMesh.geometry.attributes.position;
        const orig = this.waveMesh.geometry.userData.originalPositions;
        const t = elapsed * this.waveSpeed;

        for (let i = 0; i < pos.count; i++) {
          const x = orig[i * 3];
          const y = orig[i * 3 + 1];

          // Combinação harmônica: Fundamental + Segundo Harmônico + Terceiro Harmônico
          const wave = (Math.sin(x * 0.16 + t * 1.6) * Math.cos(y * 0.20 + t * 1.1)
                     + Math.sin(x * 0.32 - t * 0.9) * 0.35
                     + Math.cos(y * 0.40 + t * 1.3) * 0.2) * this.waveAmplitude;

          pos.setZ(i, orig[i * 3 + 2] + wave);
        }
        pos.needsUpdate = true;
      }

      this.renderer.render(this.scene, this.camera);
    }

    /**
     * Libera buffers, shaders e remove listeners ao descarregar a página.
     */
    destroy() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }

      window.removeEventListener('resize', this._boundResize);
      document.removeEventListener('visibilitychange', this._boundVisibility);

      if (this.motionMediaQuery) {
        if (typeof this.motionMediaQuery.removeEventListener === 'function') {
          this.motionMediaQuery.removeEventListener('change', this._boundMotionQuery);
        } else if (typeof this.motionMediaQuery.removeListener === 'function') {
          this.motionMediaQuery.removeListener(this._boundMotionQuery);
        }
        this.motionMediaQuery = null;
      }

      if (this.waveMesh) {
        if (this.waveMesh.geometry) this.waveMesh.geometry.dispose();
        if (this.waveMesh.material) this.waveMesh.material.dispose();
        this.scene.remove(this.waveMesh);
      }

      if (this.points) {
        if (this.points.geometry) this.points.geometry.dispose();
        if (this.points.material) this.points.material.dispose();
      }

      if (this.lines) {
        if (this.lines.geometry) this.lines.geometry.dispose();
        if (this.lines.material) this.lines.material.dispose();
      }

      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.forceContextLoss) {
          this.renderer.forceContextLoss();
        }
      }

      this.isInitialized = false;
    }
  }

  // Instância singleton para uso simplificado
  let defaultInstance = null;

  const WaveformScene = {
    init: function (canvasId) {
      if (!defaultInstance) {
        defaultInstance = new VoicePartyBackground(canvasId);
      }
      return defaultInstance.init();
    },
    onSlideChange: function (slideIndex) {
      if (defaultInstance) {
        defaultInstance.onSlideChange(slideIndex);
      }
    },
    resize: function () {
      if (defaultInstance) {
        defaultInstance.onResize();
      }
    },
    destroy: function () {
      if (defaultInstance) {
        defaultInstance.destroy();
        defaultInstance = null;
      }
    },
    getInstance: function () {
      return defaultInstance;
    }
  };

  // Exportação para o escopo global
  root.VoicePartyBackground = VoicePartyBackground;
  root.WaveformScene = WaveformScene;

})(typeof window !== 'undefined' ? window : globalThis);
