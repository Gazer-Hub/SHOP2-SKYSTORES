-- Run this in Supabase SQL editor to create the payments table
create table if not exists payments (
  id text primary key,
  amount bigint,
  currency text,
  status text,
  payer jsonb,
  raw jsonb,
  created_at timestamptz
);
