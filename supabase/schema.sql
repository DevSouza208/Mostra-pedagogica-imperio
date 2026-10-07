-- Execute no SQL Editor do Supabase.
create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  class_name text not null,
  description text,
  image_url text,
  image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  visitor_id uuid not null,
  stars int not null check (stars between 1 and 5),
  suggestion text,
  comment text check (char_length(comment) <= 240),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique(project_id, visitor_id)
);

alter table public.projects enable row level security;
alter table public.reviews enable row level security;

create policy "Projetos ativos são públicos"
on public.projects for select
using (active = true);

create policy "Visitantes podem avaliar"
on public.reviews for insert
with check (
  stars between 1 and 5
  and char_length(coalesce(comment,'')) <= 240
);

insert into storage.buckets (id, name, public)
values ('project-images','project-images',true)
on conflict (id) do update set public=true;

create policy "Fotos públicas"
on storage.objects for select
using (bucket_id = 'project-images');

-- IMPORTANTE:
-- cadastro/edição/exclusão de projetos deve ser protegido por autenticação
-- antes do uso em produção. O painel admin atual funciona em modo local
-- ou com permissões de banco configuradas pela escola.