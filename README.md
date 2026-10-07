# Mostra Pedagógica • Império das Letras

Aplicação web **mobile-first e instalável como PWA** criada para a Mostra Pedagógica do **Império das Letras**, em parceria com a **Codifica**.

O projeto foi pensado especialmente para a dinâmica do **1º ano**, em que as famílias participam da construção das maquetes e também fazem parte do processo de avaliação. Cada família conhece os trabalhos, registra sua percepção e pode revisar suas respostas antes de encerrar a visita.

> **Status:** pronto para uso no evento ✅

## Acesso

- **Aplicação pública:** https://mostra-pedagogica-imperio.pages.dev/
- **Painel administrativo:** https://mostra-pedagogica-imperio.pages.dev/admin.html
- **API / Worker:** https://mostra-pedagogica-imperio-api.imperio-96d.workers.dev

## Como funciona

O visitante escaneia o QR Code da mostra e segue um fluxo simples:

1. recebe as boas-vindas;
2. lê avisos rápidos sobre privacidade e persistência do progresso;
3. vê um pequeno tutorial;
4. conhece um projeto por vez;
5. avalia de **1 a 5 estrelas**;
6. pode marcar **mais de um elogio**;
7. pode deixar um comentário opcional;
8. segue até conhecer todos os projetos;
9. revisa suas avaliações;
10. pode editar qualquer resposta antes ou depois de concluir a visita.

A ordem dos projetos é embaralhada por visitante para distribuir melhor a experiência ao longo do evento.

## Recursos da experiência das famílias

- ⭐ avaliação obrigatória de 1 a 5 estrelas;
- 💬 múltiplos elogios por projeto;
- ✍️ comentário livre opcional;
- 🖼️ galeria com várias fotos por maquete;
- 🔄 progresso salvo no aparelho;
- 📱 retomada após recarregar ou fechar o navegador;
- ✏️ edição de avaliações já enviadas;
- 🧾 revisão final com miniaturas estilo polaroid;
- ℹ️ tutorial acessível novamente durante a avaliação;
- ✨ transições e splash screens entre etapas importantes;
- 👨‍👩‍👧 nova visita no mesmo aparelho para outra família;
- 🆕 projetos cadastrados durante o evento entram automaticamente nas visitas em andamento;
- 📲 suporte a PWA e instalação na tela inicial.

### Persistência da visita

Cada navegador recebe um identificador anônimo armazenado em `localStorage`.

Esse identificador é usado para:

- recuperar avaliações já enviadas;
- reconstruir o progresso;
- evitar avaliações duplicadas do mesmo visitante para o mesmo projeto;
- permitir editar uma avaliação existente.

Não são solicitados nome, e-mail, telefone ou cadastro das famílias.

> O modo anônimo/privado não é recomendado, porque o navegador pode apagar o identificador local ao ser fechado.

## Painel administrativo

O painel foi pensado para uso rápido durante a preparação e durante a própria mostra.

### Projetos

- cadastrar nome, turma e descrição;
- tirar foto diretamente pela câmera do celular;
- selecionar várias imagens;
- visualizar miniaturas;
- editar projeto depois de cadastrado;
- trocar, adicionar ou remover fotos;
- manter o mesmo `project_id` durante edições, preservando as avaliações recebidas;
- excluir projetos somente após confirmação digitando **`excluir`**.

### Avaliações

O painel exibe:

- total de avaliações;
- média geral;
- quantidade de comentários;
- cards de projetos com miniatura e média;
- detalhes individuais por projeto;
- total de avaliações do projeto;
- média do projeto;
- comentários recebidos;
- elogios mais recebidos e sua frequência.

Exemplo:

```text
Muito criativo  5x
Incrível!       3x
Bem feito       2x
```

## Arquitetura

```text
Famílias / Professores
        │
        ▼
Cloudflare Pages
HTML + CSS + JavaScript
        │
        ▼
Cloudflare Worker
        │
   ┌────┴────┐
   ▼         ▼
Cloudflare   Cloudflare
D1           R2
dados        imagens
```

### Stack

- **Frontend:** HTML, CSS e JavaScript puro;
- **Hospedagem:** Cloudflare Pages;
- **API:** Cloudflare Workers;
- **Banco:** Cloudflare D1;
- **Imagens:** Cloudflare R2;
- **PWA:** Web App Manifest + Service Worker;
- **Deploy:** integrado ao GitHub pela branch `main`.

## Banco de dados

O backend mantém duas entidades principais.

### `projects`

Armazena:

- título;
- turma;
- descrição;
- chaves das imagens no R2;
- estado ativo;
- data de criação.

### `reviews`

Armazena:

- projeto avaliado;
- identificador anônimo do visitante;
- estrelas;
- elogios selecionados;
- comentário;
- data da avaliação.

A combinação `project_id + visitor_id` é única. Caso a família edite uma avaliação, o registro existente é atualizado em vez de criar um voto duplicado.

## Projetos adicionados durante o evento

O catálogo não fica congelado quando uma família inicia a visita.

A aplicação:

- consulta novamente os projetos durante o percurso;
- inclui novos projetos sem apagar o progresso atual;
- confere a lista antes da revisão final;
- verifica novamente quando o app volta ao primeiro plano;
- faz uma checagem periódica enquanto estiver aberto.

Se uma família já estiver na revisão ou na tela final e surgir uma nova maquete, ela é direcionada para avaliá-la antes de encerrar definitivamente.

## PWA

A aplicação pode ser instalada como PWA.

O Service Worker mantém em cache os principais arquivos estáticos da interface, enquanto scripts e estilos priorizam a versão de rede para facilitar atualizações durante o desenvolvimento.

> As avaliações e o carregamento dos dados ainda dependem de conexão com a internet. Não existe fila offline de avaliações nesta versão.

## Estrutura principal

```text
/
├── index.html                 # experiência pública
├── app.js                     # fluxo das famílias
├── admin.html                 # painel administrativo
├── admin.js                   # cadastro, edição e resultados
├── styles.css                 # identidade visual e responsividade
├── config.js                  # endereço da API
├── manifest.webmanifest       # configuração do PWA
├── sw.js                      # service worker
├── pwa.js                     # registro do service worker
├── splash.js                  # splash inicial
├── zoom-lock.js               # ajustes de interação mobile
├── wrangler.toml              # configuração do Cloudflare Worker
├── worker/
│   └── auth-worker.js         # API, D1 e R2
└── logo_mostra pedagogica_bgoff.png
```

## Desenvolvimento local

O frontend não exige build.

Basta servir a raiz do repositório com um servidor HTTP local, por exemplo:

- VS Code Live Server;
- extensão de preview do editor;
- qualquer servidor estático.

A URL da API utilizada pelo frontend fica em `config.js`.

Para trabalhar com o Worker, as configurações de D1 e R2 estão em `wrangler.toml`.

## Antes do evento

Checklist recomendado:

- cadastrar todos os projetos disponíveis;
- conferir nome e turma;
- validar as fotos;
- testar uma visita completa em um celular diferente;
- verificar o painel de avaliações;
- garantir Wi-Fi ou 4G disponível no local;
- evitar navegação privada nos aparelhos das famílias.

## Identidade

**Mostra Pedagógica — Ideias que ganham vida ✨**

Projeto desenvolvido para o **Império das Letras**, com participação da **Codifica**.

---

Desenvolvimento: [DevSouza208](https://github.com/DevSouza208)
