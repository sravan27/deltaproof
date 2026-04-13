create table if not exists workspaces (
  slug text primary key,
  name text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists analysis_snapshots (
  id text primary key,
  workspace_slug text not null,
  money_at_risk integer not null,
  provider text not null,
  created_at text not null,
  payload_json text not null,
  foreign key (workspace_slug) references workspaces(slug)
);

create index if not exists analysis_snapshots_workspace_slug_created_at_idx
  on analysis_snapshots(workspace_slug, created_at desc);
