<div align="center">

<img src="./Logo_Mostra%20Pedag%C3%B3gica_bgo.png" alt="Mostra Pedagógica" width="220" />

# Mostra Pedagógica

### Ideias que ganham vida ✨

Aplicação web mobile-first para a **Mostra Pedagógica do Império das Letras**, em parceria com a **Codifica**.

<br />

[![Status](https://img.shields.io/badge/status-pronto%20para%20o%20evento-22a06b?style=for-the-badge)](#)
[![PWA](https://img.shields.io/badge/PWA-instalável-0b8fc6?style=for-the-badge&logo=pwa&logoColor=white)](#)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](#)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflareworkers&logoColor=white)](#)

[**🌐 Abrir aplicação**](https://mostra-pedagogica-imperio.pages.dev/) ·
[**🧑‍🏫 Painel administrativo**](https://mostra-pedagogica-imperio.pages.dev/admin.html) ·
[**⚡ API**](https://mostra-pedagogica-imperio-api.imperio-96d.workers.dev)

</div>

---

## Sobre o projeto

A plataforma foi criada para uma dinâmica de **avaliação participativa entre famílias** durante a Mostra Pedagógica.

Cada visitante percorre os projetos um por vez, visualiza as maquetes, registra uma nota em estrelas, escolhe elogios e pode deixar um comentário. No final, todas as respostas podem ser revisadas antes do encerramento da visita.

O foco é manter a experiência **simples para as famílias**, **prática para a equipe escolar** e suficientemente flexível para continuar funcionando mesmo com novos projetos sendo cadastrados durante o evento.

## Destaques

| Famílias | Equipe escolar |
| --- | --- |
| ⭐ Avaliação de 1 a 5 estrelas | ➕ Cadastro de projetos |
| 💬 Múltiplos elogios | 📸 Upload de várias fotos |
| ✍️ Comentário opcional | ✏️ Edição sem perder avaliações |
| 🖼️ Galeria de fotos | 🗑️ Exclusão com confirmação |
| 💾 Progresso persistente | 📊 Médias e comentários por projeto |
| 🔄 Retomada após fechar ou recarregar | 💙 Ranking dos elogios recebidos |
| 🧾 Revisão final das respostas | 📄 Exportação de portfólio em PDF |
| ℹ️ Tutorial disponível durante a visita | 🖨️ Seleção manual dos comentários do PDF |
| 🆕 Projetos novos entram no percurso | 📱 Painel responsivo |

## Fluxo da experiência

```text
QR Code
   │
   ▼
Boas-vindas
   │
   ▼
Avisos e tutorial
   │
   ▼
Projeto 1 → Projeto 2 → Projeto 3 → ...
   │
   ▼
Revisão final
   │
   ├── editar estrelas
   ├── editar elogios
   └── editar comentário
   │
   ▼
Visita concluída
```

A ordem dos projetos é embaralhada para cada visitante.

Se um novo projeto for cadastrado durante o evento, a aplicação atualiza a fila sem apagar o progresso já realizado.

## Stack

<div align="center">

| Camada | Tecnologia |
| --- | --- |
| Frontend | HTML + CSS + JavaScript |
| Hospedagem | Cloudflare Pages |
| API | Cloudflare Workers |
| Banco de dados | Cloudflare D1 |
| Imagens | Cloudflare R2 |
| Aplicação instalável | Web App Manifest + Service Worker |
| Deploy | GitHub → Cloudflare |

</div>

## Arquitetura

```text
┌─────────────────────────────┐
│      Famílias / Escola      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Cloudflare Pages       │
│   HTML • CSS • JavaScript   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     Cloudflare Worker       │
│          REST API           │
└──────────┬─────────┬────────┘
           │         │
           ▼         ▼
     ┌─────────┐ ┌─────────┐
     │   D1    │ │   R2    │
     │  dados  │ │ imagens │
     └─────────┘ └─────────┘
```

## Persistência da visita

Cada navegador recebe um identificador anônimo armazenado em `localStorage`.

Ele permite:

- recuperar avaliações já enviadas;
- reconstruir o progresso da visita;
- impedir duplicação do voto do mesmo visitante no mesmo projeto;
- editar uma resposta já registrada;
- continuar após fechar ou recarregar a página.

> [!NOTE]
> Nenhum nome, e-mail, telefone ou cadastro é solicitado às famílias.

> [!WARNING]
> O modo anônimo/privado não é recomendado, porque o navegador pode apagar o identificador local quando for fechado.

## Painel administrativo

O painel concentra três áreas principais:

### `Cadastrar projetos`

- nome do projeto;
- turma;
- descrição;
- uma ou várias fotos;
- captura direta pela câmera;
- seleção de imagens da galeria.

### `Projetos cadastrados`

- visualização em cards;
- edição pelo ícone de lápis;
- inclusão ou remoção de fotos;
- manutenção do mesmo `project_id` durante a edição;
- exclusão somente após digitar **`excluir`**.

Manter o mesmo `project_id` garante que as avaliações já recebidas continuem vinculadas ao projeto depois de uma edição.

### `Ver avaliações`

O painel apresenta:

- total de avaliações;
- média geral;
- total de comentários;
- média individual de cada projeto;
- avaliações detalhadas;
- elogios mais recebidos;
- comentários enviados pelas famílias.

## Exportação de PDF

Cada projeto pode gerar um **portfólio em PDF** diretamente pelo painel.

A professora escolhe o projeto, seleciona quais comentários devem aparecer e o navegador monta um documento com:

- fotos da maquete;
- nome e turma;
- média de estrelas;
- quantidade de avaliações;
- principais elogios;
- comentários selecionados;
- identidade da Mostra Pedagógica;
- Império das Letras + Codifica.

A lógica de exportação fica isolada em `pdf-export.js`.

## Dados

<details>
<summary><strong>projects</strong></summary>

<br />

Cada projeto armazena:

- `id`;
- título;
- turma;
- descrição;
- chaves das imagens no R2;
- status ativo;
- data de criação.

</details>

<details>
<summary><strong>reviews</strong></summary>

<br />

Cada avaliação armazena:

- projeto;
- `visitor_id`;
- estrelas;
- elogios;
- comentário;
- data da avaliação.

A combinação `project_id + visitor_id` é única. Ao editar uma avaliação, o backend atualiza o registro existente em vez de criar outro.

</details>

## Estrutura do repositório

```text
.
├── index.html
├── app.js
├── admin.html
├── admin.js
├── pdf-export.js
├── styles.css
├── config.js
├── manifest.webmanifest
├── sw.js
├── pwa.js
├── splash.js
├── zoom-lock.js
├── wrangler.toml
├── worker/
│   └── auth-worker.js
├── logo_mostra pedagogica_bgoff.png
├── logo_imperio.png
└── logo_codifica.png
```

<details>
<summary><strong>O que cada arquivo principal faz</strong></summary>

<br />

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Interface pública |
| `app.js` | Fluxo das famílias e avaliações |
| `admin.html` | Estrutura do painel |
| `admin.js` | Projetos, resultados e edição |
| `pdf-export.js` | Construção dos portfólios em PDF |
| `styles.css` | Identidade visual e responsividade |
| `config.js` | Endpoint da API |
| `sw.js` | Cache e comportamento do PWA |
| `worker/auth-worker.js` | API, autenticação, D1 e R2 |
| `wrangler.toml` | Configuração do Worker |

</details>

## Rodando localmente

O frontend não possui etapa de build.

Clone o repositório:

```bash
git clone https://github.com/DevSouza208/Mostra-pedagogica-imperio.git
cd Mostra-pedagogica-imperio
```

Depois sirva a raiz com um servidor HTTP local, como:

- VS Code Live Server;
- Web Preview;
- qualquer servidor estático local.

A API utilizada pelo frontend é configurada em `config.js`.

As bindings do Worker ficam em `wrangler.toml`.

## PWA

A aplicação pode ser instalada na tela inicial de dispositivos compatíveis.

O Service Worker mantém o shell principal em cache e prioriza a rede para arquivos que precisam refletir atualizações rapidamente.

> [!IMPORTANT]
> O frontend pode permanecer disponível pelo cache, mas o envio e a consulta das avaliações precisam de conexão com a internet.

## Checklist do evento

- [ ] Cadastrar todos os projetos.
- [ ] Revisar nomes, turmas e descrições.
- [ ] Conferir as fotos em um celular.
- [ ] Testar uma visita completa em outro aparelho.
- [ ] Conferir uma avaliação no painel.
- [ ] Testar a revisão final.
- [ ] Testar o QR Code impresso.
- [ ] Garantir Wi-Fi ou 4G/5G no local.

## Status

- [x] Experiência pública
- [x] Avaliações persistentes
- [x] Revisão e edição
- [x] Cadastro de projetos
- [x] Galeria de fotos
- [x] Painel de resultados
- [x] Projetos dinâmicos durante o evento
- [x] PWA
- [x] Exportação de PDF
- [x] Layout mobile-first

---

<div align="center">

### 💙 Mostra Pedagógica

**Ideias que ganham vida ✨**

Império das Letras + Codifica

<br />

Desenvolvido por [**DevSouza208**](https://github.com/DevSouza208)

</div>
