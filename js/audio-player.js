/**
 * VoiceParty & Reconhecimento de Voz — Interactivity & Audio Engine
 * Controla os clipes reais de áudio e a atualização dinâmica dos escores do VoiceParty
 *
 * Contratos:
 * - window.VoicePartyAudioPlayer = { init, playAudio, stopAll, selectCase, onSlideChange }
 */

(function (root) {
  'use strict';

  class VoicePartyAudioPlayer {
    constructor() {
      this.currentPlayingKey = null;
      this.currentAudioEl = null;
      this.activeCase = 'good'; // 'good' | 'bad'

      // Banco de áudios
      this.audioElements = {
        ref: new Audio('./assets/audio/birl_ref.wav'),
        good: new Audio('./assets/audio/birl_good.wav'),
        bad: new Audio('./assets/audio/birl_bad.wav')
      };

      // Dados de scoring oficiais levantados pelo testbench VoiceParty
      this.caseMetrics = {
        good: {
          total: 95.6,
          neural: 100.0,
          pitch: 87.51,
          rhythm: 99.97,
          phrase: 95.0,
          statusText: "🌟 Atuação Lendária!",
          feedback: "Você capturou a alma do áudio original! A curva de entonação vocal foi muito precisa e o ritmo/cadência bateram no ponto exato do meme.",
          attemptAudioKey: 'good'
        },
        bad: {
          total: 19.1,
          neural: 0.0,
          pitch: 30.95,
          rhythm: 55.21,
          phrase: 80.0,
          statusText: "😅 Ficou bem diferente!",
          feedback: "A entonação (subidas e descidas do tom F0) destoou bastante do original e o timbre monótono sem harmônicos foi penalizado pela rede siamesa.",
          attemptAudioKey: 'bad'
        }
      };

      this._setupAudioListeners();
    }

    _setupAudioListeners() {
      Object.keys(this.audioElements).forEach(key => {
        const audio = this.audioElements[key];
        audio.preload = 'auto';

        audio.addEventListener('ended', () => {
          this._resetButtonUI(key);
          this.currentPlayingKey = null;
          this.currentAudioEl = null;
        });

        audio.addEventListener('pause', () => {
          this._resetButtonUI(key);
        });

        audio.addEventListener('error', (e) => {
          console.warn(`[VoicePartyAudioPlayer] Não foi possível carregar o clipe '${key}':`, e);
          this._resetButtonUI(key);
        });
      });
    }

    init() {
      this.bindDOMControls();
      this.updateScoreboard(this.activeCase);
      return this;
    }

    bindDOMControls() {
      // Botões de Play de Referência
      const playRefBtns = document.querySelectorAll('[data-action="play-ref"]');
      playRefBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.togglePlay('ref', btn);
        });
      });

      // Botões de Play da Tentativa (Good ou Bad)
      const playAttemptBtns = document.querySelectorAll('[data-action="play-attempt"]');
      playAttemptBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const targetKey = this.caseMetrics[this.activeCase].attemptAudioKey;
          this.togglePlay(targetKey, btn);
        });
      });

      // Botões de Seleção de Caso (Good vs Bad)
      const caseBtns = document.querySelectorAll('[data-case]');
      caseBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const selectedCase = btn.getAttribute('data-case');
          this.selectCase(selectedCase);
        });
      });
    }

    togglePlay(audioKey, triggeringBtn) {
      const audio = this.audioElements[audioKey];
      if (!audio) return;

      // Se já está tocando este mesmo áudio, pausa
      if (this.currentPlayingKey === audioKey && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        this.currentPlayingKey = null;
        this.currentAudioEl = null;
        if (triggeringBtn) this._setButtonPlaying(triggeringBtn, false);
        return;
      }

      // Para qualquer outro áudio em reprodução
      this.stopAll();

      // Inicia a reprodução do novo áudio
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.currentPlayingKey = audioKey;
            this.currentAudioEl = audio;
            if (triggeringBtn) this._setButtonPlaying(triggeringBtn, true);
          })
          .catch(err => {
            console.warn('[VoicePartyAudioPlayer] Autoplay bloqueado ou erro no áudio:', err);
            this._resetButtonUI(audioKey);
          });
      }
    }

    stopAll() {
      Object.keys(this.audioElements).forEach(key => {
        const audio = this.audioElements[key];
        if (audio && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
        this._resetButtonUI(key);
      });
      this.currentPlayingKey = null;
      this.currentAudioEl = null;
    }

    selectCase(caseName) {
      if (!this.caseMetrics[caseName]) return;
      this.activeCase = caseName;
      this.stopAll();

      // Atualiza botões seletores no DOM
      const caseBtns = document.querySelectorAll('[data-case]');
      caseBtns.forEach(btn => {
        const bCase = btn.getAttribute('data-case');
        btn.classList.remove('active-good', 'active-bad');
        if (bCase === caseName) {
          btn.classList.add(caseName === 'good' ? 'active-good' : 'active-bad');
        }
      });

      // Atualiza o painel de scores
      this.updateScoreboard(caseName);
    }

    updateScoreboard(caseName) {
      const data = this.caseMetrics[caseName];
      if (!data) return;

      // Atualiza Placar Geral
      const totalScoreEl = document.getElementById('demo-total-score');
      if (totalScoreEl) {
        this._animateNumber(totalScoreEl, data.total, 1);
      }

      const totalLabelEl = document.getElementById('demo-total-label');
      if (totalLabelEl) {
        totalLabelEl.textContent = data.statusText;
        totalLabelEl.style.color = caseName === 'good' ? 'var(--mint)' : 'var(--coral)';
      }

      // Atualiza as 4 métricas individuais
      this._updateMetricBar('neural', data.neural, caseName);
      this._updateMetricBar('pitch', data.pitch, caseName);
      this._updateMetricBar('rhythm', data.rhythm, caseName);
      this._updateMetricBar('phrase', data.phrase, caseName);

      // Atualiza o card narrativo de diagnóstico
      const feedbackEl = document.getElementById('demo-feedback-text');
      if (feedbackEl) {
        feedbackEl.innerHTML = `<strong>Diagnóstico VoiceParty:</strong> ${data.feedback}`;
      }
    }

    _updateMetricBar(metricKey, value, caseName) {
      const valEl = document.getElementById(`metric-val-${metricKey}`);
      const barEl = document.getElementById(`metric-bar-${metricKey}`);

      if (valEl) {
        valEl.textContent = `${value.toFixed(1)}%`;
      }

      if (barEl) {
        barEl.style.width = `${Math.min(100, Math.max(0, value))}%`;
        barEl.className = 'score-bar-fill';
        barEl.classList.add(caseName === 'good' ? 'score-bar-fill--good' : 'score-bar-fill--bad');
      }
    }

    _animateNumber(element, target, decimals = 1, duration = 600) {
      const start = parseFloat(element.textContent) || 0;
      const startTime = performance.now();

      const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing cúbico desacelerado
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentVal = start + (target - start) * ease;

        element.textContent = currentVal.toFixed(decimals);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          element.textContent = target.toFixed(decimals);
        }
      };

      requestAnimationFrame(step);
    }

    _setButtonPlaying(btn, isPlaying) {
      const textSpan = btn.querySelector('.btn-text');
      const iconSpan = btn.querySelector('.btn-icon');
      if (isPlaying) {
        if (textSpan) textSpan.textContent = 'Pausar Áudio';
        if (iconSpan) iconSpan.textContent = '⏸';
        btn.classList.add('is-playing');
      } else {
        if (textSpan) textSpan.textContent = textSpan.getAttribute('data-original-text') || 'Tocar Áudio';
        if (iconSpan) iconSpan.textContent = '▶';
        btn.classList.remove('is-playing');
      }
    }

    _resetButtonUI(audioKey) {
      const allPlayBtns = document.querySelectorAll('[data-action^="play-"]');
      allPlayBtns.forEach(btn => {
        const textSpan = btn.querySelector('.btn-text');
        const iconSpan = btn.querySelector('.btn-icon');
        if (textSpan) {
          const original = textSpan.getAttribute('data-original-text');
          if (original) textSpan.textContent = original;
        }
        if (iconSpan) iconSpan.textContent = '▶';
        btn.classList.remove('is-playing');
      });
    }

    onSlideChange(slideIndex) {
      // Sempre interrompe qualquer áudio em reprodução ao mudar de slide
      this.stopAll();
    }
  }

  root.VoicePartyAudioPlayer = new VoicePartyAudioPlayer();
})(typeof window !== 'undefined' ? window : this);
