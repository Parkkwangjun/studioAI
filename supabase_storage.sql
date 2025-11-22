-- Create a new storage bucket called 'assets'
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true);

-- Policy: Allow public read access to all files in 'assets' bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'assets' );

-- Policy: Allow authenticated users to upload files to 'assets' bucket
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'assets'
    and auth.role() = 'authenticated'
  );

-- Policy: Allow users to update their own files (optional, but good for overwrites)
create policy "Users can update own files"
  on storage.objects for update
  using (
    bucket_id = 'assets'
    and auth.uid() = owner
  );

-- Policy: Allow users to delete their own files
create policy "Users can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'assets'
    and auth.uid() = owner
  );
