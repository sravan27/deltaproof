create table if not exists buyer_intents (
  id text primary key,
  created_at text not null,
  source text not null,
  name text not null,
  email text not null,
  company text not null,
  notes text,
  workspace_name text not null,
  workspace_slug text not null,
  plan text not null,
  money_at_risk integer not null,
  shadow_pipeline integer not null,
  decision_window_days integer not null
);

create index if not exists buyer_intents_created_at_idx
  on buyer_intents(created_at desc);

create index if not exists buyer_intents_workspace_slug_idx
  on buyer_intents(workspace_slug);
