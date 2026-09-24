-- Run this in Supabase SQL Editor so the publishable browser key can read
-- the catalog tables. Keep all write policies disabled unless the product
-- later adds authenticated admin workflows.
alter table public.companies enable row level security;
alter table public.data_centers enable row level security;

do $$
begin
  create policy "Public can read companies"
    on public.companies for select to anon, authenticated using (true);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public can read data centers"
    on public.data_centers for select to anon, authenticated using (true);
exception
  when duplicate_object then null;
end $$;
