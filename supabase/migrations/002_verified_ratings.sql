begin;
alter table public.reviews add column updated_at timestamptz not null default now();
alter table public.reviews alter column review set default '';
-- Backend-only view: never expose buyer identities via the public Data API.
create view public.verified_book_owners as
select l.user_id,l.ebook_id,l.order_id from public.user_library l
join public.orders o on o.id=l.order_id and o.user_id=l.user_id
join public.payments p on p.order_id=o.id and p.user_id=l.user_id
join public.order_items i on i.order_id=o.id and i.ebook_id=l.ebook_id
where o.status='paid' and p.status='captured'
and p.amount=o.total and p.currency=o.currency;
revoke all on public.verified_book_owners from public,anon,authenticated;
-- Existing reviews RLS remains enabled with no customer write grants.
commit;
