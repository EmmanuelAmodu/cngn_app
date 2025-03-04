-- Create onramp_requests table
create table onramp_requests (
  id uuid default uuid_generate_v4() primary key,
  onramp_id text not null unique,
  user_address text not null,
  account_name text not null,
  virtual_account text not null,
  bank_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create offramps table
create table offramps (
  id uuid default uuid_generate_v4() primary key,
  offramp_id text not null unique,
  user_address text not null,
  bank_account text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create deposits table
create table deposits (
  id uuid default uuid_generate_v4() primary key,
  bank_reference text not null,
  user_address text not null,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  bank_payment_reference text,
  onramp_id text not null references onramp_requests(onramp_id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create withdrawals table with status field
create table withdrawals (
  id uuid default uuid_generate_v4() primary key,
  user_address text not null,
  amount integer not null,
  offramp_id text not null references offramps(offramp_id),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  bank_transfer_reference text,
  processed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create bridges table
create table bridges (
  id uuid default uuid_generate_v4() primary key,
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
create index idx_onramp_requests_user_address on onramp_requests(user_address);
create index idx_offramps_user_address on offramps(user_address);
create index idx_deposits_user_address on deposits(user_address);
create index idx_withdrawals_user_address on withdrawals(user_address);
create index idx_bridges_user_address on bridges(user_address);
create index idx_withdrawals_status on withdrawals(status);
create index idx_bridges_status on bridges(status);

-- Add trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Add trigger to update updated_at timestamp for withdrawals
create trigger update_withdrawals_updated_at
    before update on withdrawals
    for each row
    execute function update_updated_at_column();

-- Add trigger to update updated_at timestamp for bridges
create trigger update_bridges_updated_at
    before update on bridges
    for each row
    execute function update_updated_at_column();

-- Add trigger to update updated_at timestamp for deposits
create trigger update_deposits_updated_at
    before update on deposits
    for each row
    execute function update_updated_at_column();

