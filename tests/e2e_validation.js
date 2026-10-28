/**
 * Suíte de Validação E2E e Integridade Estática
 * Valida a existência de arquivos, sintaxe JS, conformidade de caminhos relativos,
 * integridade dos 8 slides e sincronização de notas do orador.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failures++;
  }
}

console.log('====================================================');
console.log('🧪 INICIANDO VALIDAÇÃO INTEGRADA DO MILESTONE 2');
console.log('====================================================\n');

// 1. Verificação de Arquivos Obrigatórios
console.log('1. Verificação de Existência dos Arquivos de Produção:');
const requiredFiles = [
  'index.html',
  'css/main.css',
  'css/slides.css',
  'css/notes-modal.css',
  'js/three.min.js',
  'js/background3d.js',
  'js/notes-data.js',
  'js/audio-player.js',
  'js/app.js',
  'assets/audio/birl_ref.wav',
  'assets/audio/birl_good.wav',
  'assets/audio/birl_bad.wav',
  'assets/img/loss_curve.png',
  'assets/diagrams/neuron_diagram.svg',
  'assets/diagrams/activation_curves.svg',
  'assets/diagrams/crnn_architecture.svg',
  'assets/diagrams/audio_representations.svg',
  'assets/fonts/instrument-serif-400.woff2',
  'assets/fonts/instrument-serif-italic.woff2',
  'assets/fonts/inter-variable.woff2',
  'assets/fonts/jetbrains-mono-variable.woff2'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const size = exists ? fs.statSync(file).size : 0;
  assert(exists && size > 0, `${file} (${size} bytes)`);
});

// 2. Verificação de Sintaxe JavaScript (node -c)
console.log('\n2. Verificação de Sintaxe JavaScript:');
const jsFiles = [
  'js/three.min.js',
  'js/background3d.js',
  'js/notes-data.js',
  'js/audio-player.js',
  'js/app.js'
];

jsFiles.forEach(jsFile => {
  try {
    cp.execSync(`node -c "${jsFile}"`);
    assert(true, `${jsFile} sintaxe válida (node -c)`);
  } catch (err) {
    assert(false, `${jsFile} erro de sintaxe: ${err.message}`);
  }
});

// 3. Verificação de Ausência de Caminhos Absolutos
console.log('\n3. Verificação de Caminhos Relativos (GitHub Pages / Offline):');
const sourceFiles = [
  'index.html',
  'css/main.css',
  'css/slides.css',
  'css/notes-modal.css',
  'js/audio-player.js',
  'js/app.js'
];

const absolutePathRegex = /(href|src)=["']\/[a-zA-Z0-9]|url\(["']?\/[a-zA-Z0-9]/i;

sourceFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasAbsolute = absolutePathRegex.test(content);
  assert(!hasAbsolute, `${file} utiliza exclusivamente caminhos relativos`);
});

// 4. Verificação Estrutural de index.html
console.log('\n4. Verificação Estrutural de index.html:');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// Canvas 3D
assert(indexHtml.includes('<canvas id="canvas-bg"'), 'Canvas WebGL 3D presente');

// 8 Slides
for (let i = 1; i <= 8; i++) {
  assert(
    indexHtml.includes(`id="slide-${i}"`) && indexHtml.includes(`data-slide-index="${i - 1}"`),
    `Slide ${i} presente com data-slide-index="${i - 1}"`
  );
}

// Diagramas SVG e Imagem
assert(indexHtml.includes('assets/diagrams/neuron_diagram.svg'), 'Neuron diagram SVG embutido');
assert(indexHtml.includes('assets/diagrams/audio_representations.svg'), 'Audio representations SVG embutido');
assert(indexHtml.includes('assets/diagrams/crnn_architecture.svg'), 'CRNN architecture SVG embutido');
assert(indexHtml.includes('assets/img/loss_curve.png'), 'loss_curve.png embutida no slide 6');

// HUD e Controles
assert(indexHtml.includes('class="hud"'), 'HUD de navegação presente');
assert(indexHtml.includes('id="hud-current"'), 'Contador numérico presente no HUD');
assert(indexHtml.includes('class="hud__progress-track"'), 'Barra de progresso segmentada presente');
assert(indexHtml.includes('id="hud-btn-notes"'), 'Botão de Notas [N] presente no HUD');

// Modal de Notas
assert(indexHtml.includes('class="notes-modal"'), 'Modal de notas do apresentador presente');
assert(indexHtml.includes('id="notes-speech-body"'), 'Container de roteiro falado verbatim presente');
assert(indexHtml.includes('id="notes-qa-container"'), 'Container de perguntas e respostas da banca presente');

// Ordem dos Scripts
const threeIdx = indexHtml.indexOf('js/three.min.js');
const bgIdx = indexHtml.indexOf('js/background3d.js');
const notesIdx = indexHtml.indexOf('js/notes-data.js');
const appIdx = indexHtml.indexOf('js/app.js');

assert(
  threeIdx > -1 && bgIdx > threeIdx && notesIdx > bgIdx && appIdx > notesIdx,
  'Scripts carregados na ordem canônica correta (three -> background3d -> notes-data -> app)'
);
assert(!indexHtml.includes('data-action="play-'), 'Nenhum botão de reprodução de áudio presente no HTML');

// 5. Verificação dos Dados de Notas (notes-data.js)
console.log('\n5. Verificação dos Dados de Notas do Orador:');
const notesDataContent = fs.readFileSync('js/notes-data.js', 'utf8');
assert(notesDataContent.includes('slideIndex: 0'), 'Slide 1 (index 0) com notas cadastradas');
assert(notesDataContent.includes('slideIndex: 7'), 'Slide 8 (index 7) com notas cadastradas');
assert(notesDataContent.includes('Aprendizado Supervisionado'), 'Explicação de Aprendizado Supervisionado nas notas');
assert(notesDataContent.includes('calculadora com opinião'), 'Metáfora do neurônio da aula nas notas');
assert(notesDataContent.includes('MFCCs'), 'Menção aos MFCCs e Escala Mel nas notas');

// 6. Verificação de Ausência de Reprodução de Áudio no Site
console.log('\n6. Verificação de Ausência de Reprodução de Áudio:');
assert(!indexHtml.includes('audio-player.js'), 'Script audio-player.js removido do index.html');
assert(!indexHtml.includes('<audio'), 'Nenhuma tag <audio> no index.html');

console.log('\n====================================================');
if (failures === 0) {
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error(`⚠️ TOTAL DE FALHAS DETECTADAS: ${failures}`);
  console.log('====================================================');
  process.exit(1);
}
