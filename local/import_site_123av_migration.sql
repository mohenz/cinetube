update public.common_codes
set code_label = '123AV',
    extra = jsonb_set(coalesce(extra, '{}'::jsonb), '{placeholder}', '"https://123av.com/ko/v/... 또는 작품번호"'::jsonb, true)
where code_group = 'import_site'
  and code_value = 'missav';
