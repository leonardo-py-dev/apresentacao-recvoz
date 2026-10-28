/**
 * VoiceParty & Reconhecimento de Voz — Main Application Controller
 * Navegação por teclado, HUD, sincronização com Three.js e Notas do Orador ('N')
 */

(function () {
  'use strict';

  class PresentationApp {
    constructor() {
      this.totalSlides = 8;
      this.currentSlide = 0;
      this.isNotesOpen = false;
      this.isHelpOpen = false;
      this.lastNavTime = -Infinity;
      this.navCooldownMs = 220; // Previne salto duplo acidental
      this.idleTimeout = null;

      // Títulos amigáveis para o HUD
      this.slideTitles = [
        "01. Capa & Projeto VoiceParty",
        "02. Aprendizado Supervisionado",
        "03. O que é uma Rede Neural?",
        "04. STFT, Espectrograma e MFCCs",
        "05. Coleta e Prática com Librosa",
        "06. Criação e Treino do Modelo",
        "07. Tipos de Redes: CNN vs RNN",
        "08. Acertos, Erros e Reflexão"
      ];
    }

    init() {
      // 1. Inicializa background 3D se disponível
      if (window.WaveformScene && typeof window.WaveformScene.init === 'function') {
        const bgCanvas = document.getElementById('canvas-bg');
        window.WaveformScene.init(bgCanvas);
      }

      // 2. Lê o slide inicial da URL (hash)
      this.readHash();

      // 4. Configura listeners de eventos
      this.bindKeyboardEvents();
      this.bindHUDEvents();
      this.bindNotesEvents();
      this.bindHelpEvents();
      this.bindIdleTracker();
      this.bindDiagramInteractions();

      // 5. Aplica estado inicial
      this.goToSlide(this.currentSlide, false);
      window.addEventListener('hashchange', () => this.readHash());
    }

    readHash() {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('slide-')) {
        const idx = parseInt(hash.replace('slide-', ''), 10) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < this.totalSlides) {
          this.goToSlide(idx, false);
        }
      }
    }

    updateHash(index) {
      const newHash = `#slide-${index + 1}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    }

    canNavigate() {
      const now = performance.now();
      if (now - this.lastNavTime < this.navCooldownMs) {
        return false;
      }
      this.lastNavTime = now;
      return true;
    }

    goToSlide(index, updateHistory = true) {
      if (index < 0 || index >= this.totalSlides) return;

      const previousSlide = this.currentSlide;
      this.currentSlide = index;

      // 1. Atualiza classes nos slides no DOM
      const slides = document.querySelectorAll('.slide');
      slides.forEach((slide, idx) => {
        if (idx === index) {
          slide.classList.add('active');
          slide.scrollTop = 0; // Reseta rolagem do slide
        } else {
          slide.classList.remove('active');
        }
      });

      // 2. Atualiza HUD
      this.updateHUD(index);

      // 3. Notifica o background 3D WebGL
      if (window.WaveformScene && typeof window.WaveformScene.onSlideChange === 'function') {
        window.WaveformScene.onSlideChange(index);
      }

      // 4. Atualiza o conteúdo do modal de notas se estiver aberto ou fechado
      this.renderNotesContent(index);

      // 6. Atualiza Hash
      if (updateHistory) {
        this.updateHash(index);
      }
    }

    nextSlide() {
      if (!this.canNavigate()) return;
      if (this.currentSlide < this.totalSlides - 1) {
        this.goToSlide(this.currentSlide + 1);
      }
    }

    prevSlide() {
      if (!this.canNavigate()) return;
      if (this.currentSlide > 0) {
        this.goToSlide(this.currentSlide - 1);
      }
    }

    // =========================================================================
    // HUD E PROGRESSO
    // =========================================================================

    updateHUD(index) {
      // Indicador numérico
      const currentNumEl = document.getElementById('hud-current');
      if (currentNumEl) {
        currentNumEl.textContent = String(index + 1).padStart(2, '0');
      }

      const totalNumEl = document.getElementById('hud-total');
      if (totalNumEl) {
        totalNumEl.textContent = String(this.totalSlides).padStart(2, '0');
      }

      // Título do slide no HUD
      const titleEl = document.getElementById('hud-title');
      if (titleEl && this.slideTitles[index]) {
        titleEl.textContent = this.slideTitles[index];
      }

      // Segmentos da barra de progresso
      const segments = document.querySelectorAll('.hud__progress-segment');
      segments.forEach((seg, idx) => {
        seg.classList.remove('is-done', 'is-active');
        if (idx < index) {
          seg.classList.add('is-done');
        } else if (idx === index) {
          seg.classList.add('is-active');
        }
      });
    }

    bindHUDEvents() {
      // Botões Prev / Next
      const prevBtn = document.getElementById('hud-btn-prev');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => this.prevSlide());
      }

      const nextBtn = document.getElementById('hud-btn-next');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => this.nextSlide());
      }

      // Botão Notas [N]
      const notesBtn = document.getElementById('hud-btn-notes');
      if (notesBtn) {
        notesBtn.addEventListener('click', () => this.toggleNotes());
      }

      // Botão Tela Cheia [F]
      const fsBtn = document.getElementById('hud-btn-fs');
      if (fsBtn) {
        fsBtn.addEventListener('click', () => this.toggleFullscreen());
      }

      // Botão Ajuda [H]
      const helpBtn = document.getElementById('hud-btn-help');
      if (helpBtn) {
        helpBtn.addEventListener('click', () => this.toggleHelp());
      }

      // Cliques nos segmentos da barra de progresso
      const segments = document.querySelectorAll('.hud__progress-segment');
      segments.forEach((seg, idx) => {
        seg.addEventListener('click', () => {
          this.goToSlide(idx);
        });
      });
    }

    bindIdleTracker() {
      const hud = document.querySelector('.hud');
      if (!hud) return;

      const resetIdle = () => {
        hud.classList.remove('is-idle');
        clearTimeout(this.idleTimeout);
        this.idleTimeout = setTimeout(() => {
          hud.classList.add('is-idle');
        }, 3200);
      };

      window.addEventListener('mousemove', resetIdle);
      window.addEventListener('keydown', resetIdle);
      window.addEventListener('touchstart', resetIdle);
      resetIdle();
    }

    // =========================================================================
    // TECLADO E ATALHOS
    // =========================================================================

    bindKeyboardEvents() {
      window.addEventListener('keydown', (e) => {
        // Se o foco estiver em um input ou textarea, não intercepta
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          return;
        }

        switch (e.key) {
          case 'ArrowRight':
          case ' ':
          case 'PageDown':
          case 'Enter':
            e.preventDefault();
            this.nextSlide();
            break;

          case 'ArrowLeft':
          case 'PageUp':
          case 'Backspace':
            e.preventDefault();
            this.prevSlide();
            break;

          case 'Home':
            e.preventDefault();
            this.goToSlide(0);
            break;

          case 'End':
            e.preventDefault();
            this.goToSlide(this.totalSlides - 1);
            break;

          case 'n':
          case 'N':
            e.preventDefault();
            this.toggleNotes();
            break;

          case 'f':
          case 'F':
            e.preventDefault();
            this.toggleFullscreen();
            break;

          case 'h':
          case 'H':
          case '?':
            e.preventDefault();
            this.toggleHelp();
            break;

          case 'Escape':
            if (this.isHelpOpen) {
              e.preventDefault();
              this.toggleHelp(false);
            } else if (this.isNotesOpen) {
              e.preventDefault();
              this.toggleNotes(false);
            }
            break;
        }
      });
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Erro ao ativar tela cheia:', err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    // =========================================================================
    // PAINEL DE NOTAS DO APRESENTADOR ('N')
    // =========================================================================

    toggleNotes(forceState) {
      const modal = document.querySelector('.notes-modal');
      const btn = document.getElementById('hud-btn-notes');
      if (!modal) return;

      this.isNotesOpen = forceState !== undefined ? forceState : !this.isNotesOpen;

      if (this.isNotesOpen) {
        modal.classList.add('is-open');
        if (btn) btn.classList.add('active');
        this.renderNotesContent(this.currentSlide);
      } else {
        modal.classList.remove('is-open');
        if (btn) btn.classList.remove('active');
      }
    }

    bindNotesEvents() {
      const modal = document.querySelector('.notes-modal');
      if (!modal) return;

      // ISOLAMENTO DE EVENTOS CRÍTICO:
      // O apresentador pode rolar o texto usando Space, Setas ou PageDown
      // sem acionar a troca de slides na apresentação!
      const isolateKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
      modal.addEventListener('keydown', (e) => {
        if (isolateKeys.includes(e.key)) {
          e.stopPropagation();
        }
      });

      modal.addEventListener('wheel', (e) => {
        e.stopPropagation();
      });

      // Botão de fechar do modal
      const closeBtn = document.getElementById('notes-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.toggleNotes(false));
      }
    }

    renderNotesContent(slideIndex) {
      if (!window.NotesData || !window.NotesData[slideIndex]) return;
      const data = window.NotesData[slideIndex];

      // Header
      const slideNumEl = document.getElementById('notes-slide-num');
      if (slideNumEl) slideNumEl.textContent = String(slideIndex + 1).padStart(2, '0');

      const timeEl = document.getElementById('notes-time');
      if (timeEl) timeEl.textContent = `⏱️ ${data.time}`;

      // Roteiro falado
      const speechBody = document.getElementById('notes-speech-body');
      if (speechBody && Array.isArray(data.speech)) {
        speechBody.innerHTML = data.speech.map(p => `<p>${p}</p>`).join('');
      }

      // Bullet points
      const bulletsList = document.getElementById('notes-bullets-list');
      if (bulletsList && Array.isArray(data.bullets)) {
        bulletsList.innerHTML = data.bullets.map(b => `<li class="notes-bullet-item">${b}</li>`).join('');
      }

      // Q&A da banca
      const qaContainer = document.getElementById('notes-qa-container');
      if (qaContainer && Array.isArray(data.qa)) {
        qaContainer.innerHTML = data.qa.map(item => `
          <div class="notes-qa-item" style="margin-bottom: 0.8rem;">
            <div class="notes-qa__q">${item.question}</div>
            <div class="notes-qa__a">${item.answer}</div>
          </div>
        `).join('');
      }
    }

    // =========================================================================
    // MODAL DE AJUDA ('H')
    // =========================================================================

    toggleHelp(forceState) {
      const modal = document.querySelector('.help-modal');
      const btn = document.getElementById('hud-btn-help');
      if (!modal) return;

      this.isHelpOpen = forceState !== undefined ? forceState : !this.isHelpOpen;

      if (this.isHelpOpen) {
        modal.classList.add('is-open');
        if (btn) btn.classList.add('active');
      } else {
        modal.classList.remove('is-open');
        if (btn) btn.classList.remove('active');
      }
    }

    bindHelpEvents() {
      const modal = document.querySelector('.help-modal');
      if (!modal) return;

      const closeBtn = document.getElementById('help-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.toggleHelp(false));
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.toggleHelp(false);
        }
      });
    }

    // =========================================================================
    // INTERATIVIDADE NOS DIAGRAMAS SVG
    // =========================================================================

    bindDiagramInteractions() {
      // 1. Sliders de pesos e bias do Neurônio (Slide 2)
      const w1Slider = document.getElementById('slider-w1');
      const w2Slider = document.getElementById('slider-w2');
      const bSlider = document.getElementById('slider-bias');
      const neuronOutputEl = document.getElementById('neuron-output-val');

      const updateNeuron = () => {
        if (!w1Slider || !w2Slider || !bSlider || !neuronOutputEl) return;
        const w1 = parseFloat(w1Slider.value);
        const w2 = parseFloat(w2Slider.value);
        const b = parseFloat(bSlider.value);

        // Entradas fixas do exemplo da aula (Prof.ª Kátia): X = 0.5, Y = 1.0
        const x1 = 0.5, x2 = 1.0;
        const z = (x1 * w1) + (x2 * w2) + b;

        neuronOutputEl.textContent = `(0.5 × ${w1.toFixed(1)}) + (1.0 × ${w2.toFixed(1)}) = ${z.toFixed(2)}`;

        const valW1 = document.getElementById('val-w1');
        const valW2 = document.getElementById('val-w2');
        const valBias = document.getElementById('val-bias');
        if (valW1) valW1.textContent = w1.toFixed(1);
        if (valW2) valW2.textContent = w2.toFixed(1);
        if (valBias) valBias.textContent = b.toFixed(1);

        // Atualiza também os textos dentro do diagrama SVG do neurônio ao vivo!
        const svgW1 = document.getElementById('svg-w1-text');
        const svgW2 = document.getElementById('svg-w2-text');
        const svgFormula = document.getElementById('svg-formula-text');
        const svgOut = document.getElementById('svg-out-text');
        if (svgW1) svgW1.textContent = `Peso = ${w1.toFixed(1)} ${w1 >= 1.0 ? '✅' : '🤷'}`;
        if (svgW2) svgW2.textContent = `Peso = ${w2.toFixed(1)} ${w2 >= 1.0 ? '✅' : '🤷'}`;
        if (svgFormula) svgFormula.textContent = `(0.5×${w1.toFixed(1)}) + (1.0×${w2.toFixed(1)})`;
        if (svgOut) svgOut.textContent = z.toFixed(2);
      };

      if (w1Slider && w2Slider && bSlider) {
        [w1Slider, w2Slider, bSlider].forEach(s => s.addEventListener('input', updateNeuron));
        updateNeuron();
      }

      // 2. Toggles das Curvas de Ativação (Slide 2)
      const actBtns = document.querySelectorAll('[data-act-fn]');
      actBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          actBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const fn = btn.getAttribute('data-act-fn');
          this.highlightActivationCurve(fn);
        });
      });

      // 3. Toggles de Código PyTorch vs Keras/TF (Slide 6)
      const codeBtns = document.querySelectorAll('[data-code-tab]');
      codeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          codeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.getAttribute('data-code-tab');
          this.switchCodeTab(tab);
        });
      });

      // 4. Simulador Interativo de Treinamento da Rede (Módulo 01 / Slide 3)
      this.bindTrainerSimulator();

      // 5. Fluxo Interativo em Tela Cheia de Áudio (Módulo 02 / Slide 4)
      this.bindAudioFlowNodes();

      // 6. Comparador Interativo CNN vs RNN vs Híbrido (Slide 7)
      this.bindArchComparator();
    }

    bindTrainerSimulator() {
      const stepPills = document.querySelectorAll('[data-train-step]');
      const stepDescEl = document.getElementById('trainer-step-desc');
      const epochEl = document.getElementById('sim-epoch-val');
      const lossEl = document.getElementById('sim-loss-val');
      const accEl = document.getElementById('sim-acc-val');
      const accBar = document.getElementById('sim-acc-bar');
      const trainBtn = document.getElementById('btn-train-epoch');
      const resetBtn = document.getElementById('btn-reset-epoch');

      const stepTexts = [
        `<strong style="color: var(--amber);">1. Previsão (Forward):</strong> Igual a um aluno tentando resolver um exercício! O som entra na <strong>Camada de Entrada</strong>, passa pelas <strong>Camadas Ocultas</strong> e gera um palpite na <strong>Saída</strong>.`,
        `<strong style="color: var(--coral);">2. Erro (Loss):</strong> O professor corrige usando o gabarito! A função de <strong>Loss</strong> calcula a distância entre o palpite da rede e a resposta certa.`,
        `<strong style="color: var(--blue);">3. Backpropagation:</strong> O erro faz o caminho de volta pelas camadas ocultas, avisando cada neurônio do quanto ele contribuiu para o erro.`,
        `<strong style="color: var(--mint);">4. Ajuste dos Pesos (Época):</strong> A rede corrige um pouquinho os seus <strong>Pesos</strong> para errar menos na próxima repetição (<strong>Época</strong>)!`
      ];

      // Tabela de progressão realista ao longo de 10 épocas
      const epochData = [
        { epoch: 1, loss: 0.85, acc: 52 },
        { epoch: 2, loss: 0.64, acc: 63 },
        { epoch: 3, loss: 0.48, acc: 71 },
        { epoch: 4, loss: 0.35, acc: 78 },
        { epoch: 5, loss: 0.24, acc: 84 },
        { epoch: 6, loss: 0.16, acc: 89 },
        { epoch: 7, loss: 0.10, acc: 92 },
        { epoch: 8, loss: 0.06, acc: 95 },
        { epoch: 9, loss: 0.03, acc: 97 },
        { epoch: 10, loss: 0.01, acc: 98 }
      ];

      let currentEpochIdx = 0;
      let currentStepIdx = 0;

      const selectStep = (idx) => {
        currentStepIdx = idx;
        stepPills.forEach((pill, i) => {
          pill.classList.toggle('is-active', i === idx);
        });
        if (stepDescEl && stepTexts[idx]) {
          stepDescEl.innerHTML = stepTexts[idx];
        }
      };

      const renderEpoch = (idx) => {
        const d = epochData[idx];
        if (!d) return;
        if (epochEl) epochEl.textContent = `${d.epoch} / 10`;
        if (lossEl) lossEl.textContent = d.loss.toFixed(2);
        if (accEl) accEl.textContent = `${d.acc}%`;
        if (accBar) accBar.style.width = `${d.acc}%`;
      };

      stepPills.forEach((pill, idx) => {
        pill.addEventListener('click', () => selectStep(idx));
      });

      if (trainBtn) {
        trainBtn.addEventListener('click', () => {
          // Avança a época e cicla visualmente pelo passo de ajuste de pesos
          if (currentEpochIdx < epochData.length - 1) {
            currentEpochIdx++;
          } else {
            currentEpochIdx = 0;
          }
          currentStepIdx = (currentStepIdx + 1) % 4;
          selectStep(currentStepIdx);
          renderEpoch(currentEpochIdx);

          // Também atualiza levemente os sliders de peso do neurônio ao lado para mostrar a conexão!
          const w1Slider = document.getElementById('slider-w1');
          const w2Slider = document.getElementById('slider-w2');
          if (w1Slider && w2Slider) {
            const targetW1 = Math.min(3.0, (1.2 + currentEpochIdx * 0.15)).toFixed(1);
            const targetW2 = Math.max(0.1, (1.0 - currentEpochIdx * 0.1)).toFixed(1);
            w1Slider.value = targetW1;
            w2Slider.value = targetW2;
            w1Slider.dispatchEvent(new Event('input'));
          }
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          currentEpochIdx = 0;
          selectStep(0);
          renderEpoch(0);
        });
      }
    }

    bindAudioFlowNodes() {
      const flowCards = document.querySelectorAll('[data-flow-node]');
      const titleEl = document.getElementById('flow-inspector-title');
      const descEl = document.getElementById('flow-inspector-desc');
      const nextBtn = document.getElementById('btn-flow-next');

      const nodeDetails = {
        '1': {
          title: '🔍 Etapa 1 Selecionada: STFT (Transformada de Fourier de Tempo Curto)',
          desc: 'Como uma frase falada (ex: <em>"Bom dia"</em> ou <em>"Birl!"</em>) muda o tempo todo, a <strong>STFT</strong> corta o som em pequenas janelas (frames) para descobrir quais frequências (graves ou agudas) existem em cada pedacinho!'
        },
        '2': {
          title: '🎨 Etapa 2 Selecionada: Espectrograma (A "Foto" do Som)',
          desc: 'Juntando todas as janelas da STFT lado a lado, formamos um gráfico onde o <strong>Eixo X é o Tempo</strong>, o <strong>Eixo Y é a Frequência</strong> e a <strong>Cor/Brilho mostra a Intensidade (Volume)</strong> em decibéis!'
        },
        '3': {
          title: '🧠 Etapa 3 Selecionada: Escala Mel & MFCCs (Os Números para a IA)',
          desc: 'O ouvido humano percebe muito melhor diferenças em sons graves do que em sons muito agudos. A <strong>Escala Mel</strong> imita nosso ouvido e os <strong>MFCCs</strong> resumem cada pedacinho em <strong>13 números</strong> prontos para a Rede Neural!'
        }
      };

      let activeNode = 1;

      const selectFlowNode = (nodeNum) => {
        activeNode = Number(nodeNum);
        const key = String(activeNode);
        flowCards.forEach(card => {
          card.classList.toggle('is-selected', card.getAttribute('data-flow-node') === key);
        });
        if (nodeDetails[key]) {
          if (titleEl) titleEl.innerHTML = nodeDetails[key].title;
          if (descEl) descEl.innerHTML = nodeDetails[key].desc;
        }
      };

      flowCards.forEach(card => {
        card.addEventListener('click', () => {
          const n = card.getAttribute('data-flow-node');
          selectFlowNode(n);
        });
      });

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          const next = activeNode >= 3 ? 1 : activeNode + 1;
          selectFlowNode(next);
        });
      }
    }

    bindArchComparator() {
      const archCards = document.querySelectorAll('[data-arch-node]');
      const titleEl = document.getElementById('arch-inspector-title');
      const descEl = document.getElementById('arch-inspector-desc');
      const nextBtn = document.getElementById('btn-arch-next');

      const archInfo = {
        cnn: {
          title: '🔍 Rede Selecionada: CNN (Rede Neural Convolucional)',
          desc: 'Como vimos nos slides da Prof.ª Kátia, a <strong>CNN</strong> trata o espectrograma como uma fotografia! Seus filtros passam por cima da imagem reconhecendo se a voz é mais grossa, fina ou rouca.'
        },
        rnn: {
          title: '⏱️ Rede Selecionada: RNN / LSTM / GRU (Rede Recorrente)',
          desc: 'Na fala, a ordem importa! A <strong>RNN (como a GRU)</strong> possui memória do que veio antes para acompanhar a sequência das sílabas e o ritmo da frase ao longo do tempo.'
        },
        hybrid: {
          title: '🤝 Rede Selecionada: Modelo Híbrido (CNN + RNN no VoiceParty)',
          desc: 'No <strong>VoiceParty</strong> nós juntamos o melhor dos dois mundos: primeiro a <strong>CNN</strong> lê a imagem do som (timbre) e depois entrega para a <strong>GRU</strong> analisar o ritmo na linha do tempo!'
        }
      };

      const order = ['cnn', 'rnn', 'hybrid'];
      let currentIdx = 0;

      const selectArch = (key) => {
        const idx = order.indexOf(key);
        if (idx !== -1) currentIdx = idx;
        archCards.forEach(c => {
          c.classList.toggle('is-selected', c.getAttribute('data-arch-node') === key);
        });
        if (archInfo[key]) {
          if (titleEl) titleEl.innerHTML = archInfo[key].title;
          if (descEl) descEl.innerHTML = archInfo[key].desc;
        }
      };

      archCards.forEach(card => {
        card.addEventListener('click', () => {
          selectArch(card.getAttribute('data-arch-node'));
        });
      });

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          currentIdx = (currentIdx + 1) % order.length;
          selectArch(order[currentIdx]);
        });
      }
    }

    highlightActivationCurve(fnName) {
      // Destaque visual dos paths SVG no container de ativações
      const actSvg = document.getElementById('svg-activations');
      if (!actSvg) return;

      const paths = actSvg.querySelectorAll('[data-curve]');
      paths.forEach(p => {
        const curve = p.getAttribute('data-curve');
        if (curve === fnName) {
          p.style.opacity = '1';
          p.style.strokeWidth = '3.5';
        } else {
          p.style.opacity = '0.25';
          p.style.strokeWidth = '1.5';
        }
      });
    }

    switchCodeTab(tabName) {
      const codeBlock = document.getElementById('crnn-code-display');
      if (!codeBlock) return;

      if (tabName === 'keras') {
        codeBlock.textContent = `from tensorflow.keras import Sequential, layers

modelo = Sequential([
    # 1. CNN: Usa filtros como "lupa" na imagem do som
    layers.Conv2D(32, (3, 3), activation='relu', input_shape=(64, 110, 1)),
    layers.MaxPooling2D((2, 2)),
    # 2. RNN (GRU): Memória para acompanhar o ritmo no tempo
    layers.Reshape((55, -1)),
    layers.GRU(64),
    # 3. Saída: Resultado final
    layers.Dense(1, activation='sigmoid')
])
modelo.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
modelo.fit(X_treino, y_treino, epochs=10, validation_data=(X_teste, y_teste))`;
      } else {
        codeBlock.textContent = `class SiameseAudioCRNN(nn.Module):
    def __init__(self):
        super().__init__()
        # 1. Camadas CNN: Olham para o Espectrograma como imagem
        self.conv = nn.Sequential(ConvBlock(1, 32), ConvBlock(32, 64))
        # 2. Camada RNN (GRU): Acompanha a sequência no tempo
        self.gru = nn.GRU(1024, 64, batch_first=True, bidirectional=True)
        # 3. Camada de Saída: Gera o resumo numérico da voz
        self.fc = nn.Linear(128, 128)`;
      }
    }
  }

  // Inicialização no DOM Ready
  window.addEventListener('DOMContentLoaded', () => {
    window.VoicePartyApp = new PresentationApp();
    window.VoicePartyApp.init();
  });
})();
