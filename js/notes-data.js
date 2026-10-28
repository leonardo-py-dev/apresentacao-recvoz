/**
 * VoiceParty & Reconhecimento de Voz — Cola do Apresentador (Versão Curta e Simples)
 * Textos diretos, fáceis de falar em 20 a 30 segundos por slide!
 * Disponível globalmente via window.NotesData
 */

(function (root) {
  'use strict';

  const notes = [
    // Slide 0: Capa
    {
      slideIndex: 0,
      title: "01. Capa: Do Som aos Números",
      time: "00:30 min",
      speech: [
        "Olá pessoal e professora Kátia! Hoje vamos mostrar como a Inteligência Artificial reconhece a voz humana e apresentar o nosso projeto prático: o VoiceParty.",
        "A ideia é simples: o computador não tem ouvido, então precisamos transformar a voz em números para a Rede Neural aprender e dar uma nota de 0 a 100 para a nossa imitação."
      ],
      bullets: [
        "Computador não tem ouvido: transforma som em números.",
        "Projeto prático do grupo: jogo VoiceParty."
      ],
      qa: [
        {
          question: "O que o VoiceParty faz?",
          answer: "Você ouve um áudio famoso, tenta imitar no microfone e a nossa IA dá uma nota de 0 a 100 comparando sua voz com a original."
        }
      ]
    },

    // Slide 1: Aprendizado Supervisionado
    {
      slideIndex: 1,
      title: "02. O que é Aprendizado Supervisionado?",
      time: "00:40 min",
      speech: [
        "Como o computador aprende? Usando o Aprendizado Supervisionado, que é igual a estudar com uma lista de exercícios que já tem gabarito.",
        "Nós mostramos vários exemplos com a resposta certa (o rótulo): por exemplo, o áudio da palavra 'Ligar' junto com a etiqueta 'Ligar'. Assim a IA aprende o padrão sozinha!"
      ],
      bullets: [
        "Supervisionado = tem gabarito (rótulo).",
        "Não Supervisionado = não tem resposta certa, só agrupa parecidos.",
        "Reconhecimento de voz usa Aprendizado Supervisionado."
      ],
      qa: [
        {
          question: "Qual a diferença entre Supervisionado e Não Supervisionado?",
          answer: "O Supervisionado aprende com exemplos que têm resposta certa (rótulo). O Não Supervisionado não tem rótulos e agrupa dados parecidos sozinho."
        }
      ]
    },

    // Slide 2: O que é uma Rede Neural Artificial?
    {
      slideIndex: 2,
      title: "03. O que é uma Rede Neural Artificial?",
      time: "00:45 min",
      speech: [
        "A Rede Neural imita o cérebro humano usando pequenos blocos chamados neurônios. Cada neurônio é como uma 'calculadora com opinião': ele multiplica a informação pelo Peso (que é a importância dela) e soma tudo.",
        "E como ela aprende? Igual a um aluno: faz uma previsão (Forward), vê o tamanho do erro no gabarito (Loss), e o erro volta (Backpropagation) ajustando os pesos a cada repetição, chamada Época!"
      ],
      bullets: [
        "Neurônio = 'calculadora com opinião' (multiplica pelo peso e soma).",
        "Treino = Previsão -> Erro (Loss) -> Backpropagation -> Ajuste dos Pesos a cada Época.",
        "Dica: Clique no botão 'Treinar +1 Época' na tela para mostrar o erro caindo!"
      ],
      qa: [
        {
          question: "Para que servem os Pesos na rede neural?",
          answer: "Os pesos dizem qual informação é mais importante e qual é menos importante para a decisão da rede."
        }
      ]
    },

    // Slide 3: STFT, Espectrograma e MFCCs
    {
      slideIndex: 3,
      title: "04. Fluxo do Som: STFT, Espectrograma e MFCCs",
      time: "00:45 min",
      speech: [
        "Para transformar o som em números, passamos por 3 passos aqui na tela:",
        "1º: A STFT corta o áudio em pequenos pedacinhos de tempo.",
        "2º: O Espectrograma junta tudo numa 'foto do som', mostrando tempo, frequência e volume.",
        "3º: A Escala Mel e os MFCCs imitam o ouvido humano e resumem cada pedacinho em 13 números prontos para a IA!"
      ],
      bullets: [
        "1. STFT -> corta e analisa o som.",
        "2. Espectrograma -> mostra o som como imagem.",
        "3. MFCCs -> extraem 13 números que imitam o ouvido humano."
      ],
      qa: [
        {
          question: "O que são os MFCCs?",
          answer: "São coeficientes numéricos (geralmente 13 números) que resumem o timbre da voz imitando como o ouvido humano escuta."
        }
      ]
    },

    // Slide 4: Coleta e Librosa
    {
      slideIndex: 4,
      title: "05. Coleta de Dados e Biblioteca Librosa",
      time: "00:40 min",
      speech: [
        "Na prática, nós gravamos os áudios do VoiceParty e usamos a biblioteca Librosa no Python para preparar tudo.",
        "Como mostra o código na tela: carregamos o áudio com librosa.load(), tiramos o silêncio do começo e do fim com trim(), e extraímos os 13 MFCCs com uma única linha de código!"
      ],
      bullets: [
        "librosa.load() carrega o som como números.",
        "librosa.effects.trim() corta o silêncio inútil.",
        "librosa.feature.mfcc() gera a tabela de 13 números para a IA."
      ],
      qa: [
        {
          question: "Por que cortar o silêncio do áudio com o Librosa?",
          answer: "Para a IA comparar apenas o momento em que a pessoa realmente falou, sem confundir com a pausa antes de começar."
        }
      ]
    },

    // Slide 5: Criação e Treinamento do Modelo
    {
      slideIndex: 5,
      title: "06. Construindo e Treinando o Modelo",
      time: "00:45 min",
      speech: [
        "Para criar o modelo em Keras/TensorFlow ou PyTorch, separamos os dados em 80% para Treino e 20% para Teste.",
        "Para saber se o modelo ficou bom, olhamos a Acurácia (que é a porcentagem de acertos) e o Loss (que é o erro). No gráfico real do nosso treino à direita, o erro caiu de 0.162 para 0.0142 em 10 épocas!"
      ],
      bullets: [
        "Dados divididos em Treino (estudar) e Teste (avaliar).",
        "Acurácia = nota da prova (% de acertos) | Loss = tamanho do erro.",
        "No nosso treino real, o erro (Loss) caiu para 0.0142."
      ],
      qa: [
        {
          question: "Por que separamos os dados em Treino e Teste?",
          answer: "Para garantir que a rede realmente aprendeu e não apenas decorou os exemplos. Testamos com áudios que ela nunca viu antes."
        }
      ]
    },

    // Slide 6: Tipos de Redes Neurais (CNN vs RNN)
    {
      slideIndex: 6,
      title: "07. Tipos de Redes: CNN vs. RNN no Áudio",
      time: "00:45 min",
      speech: [
        "Como vimos na aula da professora Kátia, existem duas redes principais para voz:",
        "A CNN olha para o espectrograma como uma foto, usando filtros como uma 'lupa' para entender o timbre. Já a RNN (como a GRU) tem memória para seguir a ordem das sílabas no tempo.",
        "No VoiceParty, nós usamos um Modelo Híbrido: juntamos a CNN com a GRU para avaliar tanto o timbre quanto o ritmo da voz!"
      ],
      bullets: [
        "CNN = vê o espectrograma como imagem (usa lupa).",
        "RNN / GRU = segue a linha do tempo (tem memória).",
        "Modelo Híbrido (CNN + RNN) = junta imagem + tempo (usado no VoiceParty)."
      ],
      qa: [
        {
          question: "Por que juntar CNN e RNN em vez de usar só uma delas?",
          answer: "Porque a CNN é ótima para reconhecer a textura da voz na imagem do espectrograma, enquanto a RNN é ótima para acompanhar o ritmo e a sequência no tempo."
        }
      ]
    },

    // Slide 7: Acertos, Erros e Reflexão
    {
      slideIndex: 7,
      title: "08. Acertos, Erros e Reflexão Final",
      time: "00:45 min",
      speech: [
        "Para fechar: nos nossos testes, a rede acertou muito bem quando a pessoa imitava a energia e o ritmo do áudio.",
        "Já os erros acontecem principalmente por barulho de fundo no microfone ou quando uma voz muito fina tenta imitar uma voz muito grossa — o que nós resolvemos avaliando se a voz subiu e desceu na hora certa.",
        "Nossa conclusão é que a IA não 'ouve' como nós: ela apenas compara padrões nos números e depende de bons dados. Muito obrigado!"
      ],
      bullets: [
        "Acertos: capta bem energia, ritmo e melodia da fala.",
        "Erros comuns: barulho no microfone e diferença entre voz grave e aguda.",
        "Reflexão: a IA não entende o som, ela calcula padrões nos números."
      ],
      qa: [
        {
          question: "Como vocês evitaram que pessoas com voz mais fina recebessem nota baixa injustamente?",
          answer: "Nós comparamos o desenho da entonação (se a voz subiu ou desceu no momento certo) em vez de exigir a mesma frequência grave do áudio original."
        }
      ]
    }
  ];

  root.NotesData = notes;
})(typeof window !== 'undefined' ? window : this);
