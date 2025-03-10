-- Create virtual_accounts table
create table virtual_accounts (
  user_address text not null primary key,
  account_name text not null,
  account_number text not null,
  bank_name text not null,
  reference text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create onramp table
create table onramps (
  onramp_id text not null primary key,
  user_address text not null references virtual_accounts(user_address),
  amount integer not null,
  chain_id integer,
  on_chain_tx text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  payment_reference text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create offramps table
create table offramps (
  offramp_id text not null primary key,
  user_address text not null,
  bank_account text not null,
  bank_code text not null,
  chain_id integer,
  on_chain_tx text,
  bank_transfer_reference text unique,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create bridges table
create table bridges (
  bridge_id text not null primary key,
  user_address text not null,
  amount integer not null,
  source_chain_id integer not null,
  destination_chain_id integer not null,
  source_tx_hash integer not null,
  destination_tx_hash text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index idx_onramps_user_address on onramps(user_address);
create index idx_offramps_user_address on offramps(user_address);
create index idx_bridges_user_address on bridges(user_address);
create index idx_offramps_status on offramps(status);
create index idx_bridges_status on bridges(status);

-- Add trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Add trigger to update updated_at timestamp for offramps
create trigger update_offramps_updated_at
    before update on offramps
    for each row
    execute function update_updated_at_column();

-- Add trigger to update updated_at timestamp for bridges
create trigger update_bridges_updated_at
    before update on bridges
    for each row
    execute function update_updated_at_column();

-- Add trigger to update updated_at timestamp for onramps
create trigger update_onramps_updated_at
    before update on onramps
    for each row
    execute function update_updated_at_column();
