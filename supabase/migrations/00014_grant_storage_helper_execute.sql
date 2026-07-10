-- Grant execute permissions on storage path parsing helper functions to public.
-- 
-- The previous migrations revoked execute permissions on these helper functions 
-- from public, anon, and authenticated. However, because they are evaluated 
-- inside RLS policies for storage.objects under the user's role (authenticated/anon),
-- this resulted in "permission denied for function" errors during upload/download.
--
-- Since these functions are pure, immutable string/text parsers that do not query
-- any tables, granting execute on them poses no security risk.

grant execute on function storage_space_id_from_path(text) to public;
grant execute on function storage_ticket_id_from_path(text) to public;
grant execute on function storage_uploader_id_from_path(text) to public;
grant execute on function storage_enquiry_id_from_path(text) to public;
