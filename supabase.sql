-- Update bridges table with status field
alter table bridges add column status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed'));
alter table bridges add column destination_tx_hash text;
alter table bridges add column updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Add trigger to update updated_at timestamp for bridges
create trigger update_bridges_updated_at
    before update on bridges
    for each row
    execute function update_updated_at_column();

-- Create index for status
create index idx_bridges_status on bridges(status);

