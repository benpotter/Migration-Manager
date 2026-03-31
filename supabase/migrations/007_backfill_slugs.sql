UPDATE pages
SET slug = left(
  trim(both '-' from
    regexp_replace(
      lower(name),
      '[^a-z0-9]+', '-', 'g'
    )
  ),
  80
)
WHERE slug IS NULL;
