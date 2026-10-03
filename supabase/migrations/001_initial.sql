begin;
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, email text not null,
 full_name text not null default '', avatar_url text, role text not null default 'customer' check(role in ('customer','admin')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function public.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id,email,full_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();
create table public.categories(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,description text not null default '');
create table public.ebooks(
 id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,author text not null,description text not null,short_description text not null default '',
 category_id uuid not null references public.categories(id),language text not null default 'English',pages integer not null check(pages>0),
 cover_path text,private_file_path text,sample_path text,price integer not null check(price>=100),original_price integer not null check(original_price>=price),
 publication_date date,learning_points jsonb not null default '[]',is_featured boolean not null default false,is_bestseller boolean not null default false,
 status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.coupons(id uuid primary key default gen_random_uuid(),code text not null unique,discount_type text not null check(discount_type in ('percentage','fixed')),discount_value integer not null check(discount_value>0),minimum_order integer not null default 0 check(minimum_order>=0),max_uses integer check(max_uses>0),used_count integer not null default 0 check(used_count>=0),starts_at timestamptz not null,expires_at timestamptz not null,active boolean not null default true,check(expires_at>starts_at),check(discount_type<>'percentage' or discount_value<=100));
create table public.orders(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),order_number text not null unique,
 subtotal integer not null check(subtotal>0),discount integer not null default 0 check(discount>=0),total integer not null check(total>=100),currency text not null default 'INR' check(currency='INR'),
 status text not null default 'pending' check(status in ('pending','paid','failed','refunded','cancelled')),
 coupon_id uuid references public.coupons(id),razorpay_order_id text unique,callback_verified_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(total=subtotal-discount)
);
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),ebook_id uuid not null references public.ebooks(id),title text not null,price integer not null check(price>0),unique(order_id,ebook_id));
create table public.payments(id uuid primary key default gen_random_uuid(),order_id uuid not null unique references public.orders(id),user_id uuid not null references public.profiles(id),provider text not null default 'razorpay',razorpay_payment_id text not null unique,razorpay_order_id text not null,amount integer not null,currency text not null,status text not null check(status in ('captured','refunded')),verified_at timestamptz not null default now(),created_at timestamptz not null default now());
create table public.user_library(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),ebook_id uuid not null references public.ebooks(id),order_id uuid not null references public.orders(id),purchased_at timestamptz not null default now(),unique(user_id,ebook_id));
create table public.downloads(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),ebook_id uuid not null references public.ebooks(id),order_id uuid not null references public.orders(id),ip_address inet,user_agent text,kind text not null default 'download' check(kind in ('read','download')),created_at timestamptz not null default now());
create table public.reviews(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),ebook_id uuid not null references public.ebooks(id),rating integer not null check(rating between 1 and 5),review text not null,status text not null default 'pending' check(status in ('pending','published','rejected')),created_at timestamptz not null default now(),unique(user_id,ebook_id));
create table public.webhook_events(id text primary key,event_type text not null,processed_at timestamptz not null default now());
create table public.email_outbox(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),order_id uuid references public.orders(id),template text not null,payload jsonb not null default '{}',attempts integer not null default 0,sent_at timestamptz,created_at timestamptz not null default now(),unique(order_id,template));
create table public.newsletter_subscribers(email text primary key,created_at timestamptz not null default now());
create function public.queue_welcome() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.email_outbox(user_id,template) values(new.id,'welcome');return new;end $$;
create trigger on_profile_created after insert on public.profiles for each row execute function public.queue_welcome();
revoke execute on function public.queue_welcome() from public,anon,authenticated;
create index ebooks_catalog on public.ebooks(status,category_id,created_at desc);
create index orders_user on public.orders(user_id,created_at desc);
create index order_items_ebook on public.order_items(ebook_id);
create index payments_user on public.payments(user_id);
create index library_order on public.user_library(order_id);
create index downloads_user_book on public.downloads(user_id,ebook_id,kind);
create index reviews_book on public.reviews(ebook_id,status);
create index outbox_pending on public.email_outbox(created_at) where sent_at is null;
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now();return new;end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger ebooks_updated before update on public.ebooks for each row execute function public.touch_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.touch_updated_at();
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.ebooks enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.user_library enable row level security;
alter table public.downloads enable row level security;
alter table public.coupons enable row level security;
alter table public.reviews enable row level security;
alter table public.webhook_events enable row level security;
alter table public.email_outbox enable row level security;
alter table public.newsletter_subscribers enable row level security;
revoke all on all tables in schema public from anon,authenticated;
grant select on public.categories to anon,authenticated;
-- Column grants deliberately exclude paid PDF paths, even with a SELECT * request.
grant select(id,title,slug,author,description,short_description,category_id,language,pages,cover_path,sample_path,price,original_price,publication_date,learning_points,is_featured,is_bestseller,status,created_at,updated_at) on public.ebooks to anon,authenticated;
grant select on public.profiles,public.orders,public.order_items,public.payments,public.user_library,public.downloads to authenticated;
grant update(full_name,avatar_url) on public.profiles to authenticated;
create policy categories_public on public.categories for select using(true);
create policy ebooks_public on public.ebooks for select using(status='published');
create policy profile_own_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_own_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy orders_own on public.orders for select to authenticated using(user_id=(select auth.uid()));
create policy items_own on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=(select auth.uid())));
create policy payments_own on public.payments for select to authenticated using(user_id=(select auth.uid()));
create policy library_own on public.user_library for select to authenticated using(user_id=(select auth.uid()));
create policy downloads_own on public.downloads for select to authenticated using(user_id=(select auth.uid()));
revoke execute on function public.create_profile() from public,anon,authenticated;
revoke execute on function public.touch_updated_at() from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('book-covers','book-covers',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('book-samples','book-samples',true,10485760,array['application/pdf']),
 ('ebooks-private','ebooks-private',false,52428800,array['application/pdf'])
 on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- No storage.objects policies: writes and paid-file access go through the backend.
commit;
