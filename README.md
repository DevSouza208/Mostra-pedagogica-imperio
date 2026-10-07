# Mostra Pedagógica • Império das Letras

Aplicação mobile-first para avaliação dos projetos da Mostra Pedagógica, em parceria com a Codifica.

## O que já existe

- experiência estilo "Tinder das ideias": um projeto por vez;
- ordem embaralhada para cada visitante;
- avaliação obrigatória de 1 a 5 estrelas;
- sugestões de comentários sempre positivos e construtivos;
- comentário livre opcional;
- progresso da visita;
- conclusão somente depois de passar por todos os projetos;
- persistência do progresso no navegador;
- painel `/admin.html` para cadastrar projetos, turma, descrição e foto;
- suporte a foto direto da câmera do celular;
- identidade visual com as logos da Império das Letras e Codifica;
- modo demonstração sem backend;
- estrutura pronta para Supabase.

## Rodando agora

Como é HTML/CSS/JS puro, basta servir a raiz do projeto com qualquer servidor estático.

Exemplos:
- VS Code Live Server;
- Vercel;
- Netlify;
- GitHub Pages.

A página pública é `index.html`.
O painel administrativo é `admin.html`.

## Supabase

1. Crie um projeto Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Preencha `config.js`:

```js
window.MOSTRA_CONFIG = {
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseAnonKey: "SUA-ANON-KEY"
};
```

Sem essas chaves, o app funciona em modo local/demonstração usando `localStorage`.

## Antes da mostra

O fluxo público de avaliações já pode usar RLS para inserir votos sem cadastro. O painel administrativo deve receber autenticação antes do evento para impedir alterações por visitantes.

## Estrutura

- `index.html` — experiência dos pais/visitantes
- `app.js` — fluxo de avaliação
- `styles.css` — identidade visual e responsividade
- `admin.html` — painel de cadastro
- `admin.js` — gerenciamento dos projetos
- `config.js` — configuração do backend
- `supabase/schema.sql` — banco, políticas e storage
