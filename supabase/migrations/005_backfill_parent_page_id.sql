-- Backfill parent_page_id for existing rows where it's null but can be inferred.
-- Supports two conventions:
--   ".0" section roots: "1.1" → parent "1.0", "1.2.0" → parent "1.0"
--   Simple hierarchy:   "1.1.1.20.1" → parent "1.1.1.20"
-- Prefers ".0" convention if that parent exists, otherwise falls back to simple.

-- Step 1: Try ".0" convention (replace last segment with "0")
UPDATE pages p
SET parent_page_id = (
  CASE
    WHEN split_part(p.page_id, '.', array_length(string_to_array(p.page_id, '.'), 1)) = '0' THEN
      CASE
        WHEN array_length(string_to_array(p.page_id, '.'), 1) = 2 THEN NULL
        ELSE (
          SELECT string_agg(part, '.' ORDER BY ord)
          FROM unnest((string_to_array(p.page_id, '.'))[1:array_length(string_to_array(p.page_id, '.'), 1)-2])
            WITH ORDINALITY AS t(part, ord)
        ) || '.0'
      END
    ELSE (
      SELECT string_agg(part, '.' ORDER BY ord)
      FROM unnest((string_to_array(p.page_id, '.'))[1:array_length(string_to_array(p.page_id, '.'), 1)-1])
        WITH ORDINALITY AS t(part, ord)
    ) || '.0'
  END
)
WHERE p.parent_page_id IS NULL
  AND array_length(string_to_array(p.page_id, '.'), 1) > 1
  AND NOT (
    split_part(p.page_id, '.', array_length(string_to_array(p.page_id, '.'), 1)) = '0'
    AND array_length(string_to_array(p.page_id, '.'), 1) = 2
  )
  -- Only apply if the ".0" parent actually exists
  AND EXISTS (
    SELECT 1 FROM pages p2
    WHERE p2.project_id = p.project_id
      AND p2.page_id = CASE
        WHEN split_part(p.page_id, '.', array_length(string_to_array(p.page_id, '.'), 1)) = '0' THEN
          (SELECT string_agg(part, '.' ORDER BY ord)
           FROM unnest((string_to_array(p.page_id, '.'))[1:array_length(string_to_array(p.page_id, '.'), 1)-2])
             WITH ORDINALITY AS t(part, ord)) || '.0'
        ELSE
          (SELECT string_agg(part, '.' ORDER BY ord)
           FROM unnest((string_to_array(p.page_id, '.'))[1:array_length(string_to_array(p.page_id, '.'), 1)-1])
             WITH ORDINALITY AS t(part, ord)) || '.0'
      END
  );

-- Step 2: For remaining nulls, try simple hierarchy (drop last segment)
UPDATE pages p
SET parent_page_id = (
  CASE
    WHEN split_part(p.page_id, '.', array_length(string_to_array(p.page_id, '.'), 1)) = '0' THEN
      CASE
        WHEN array_length(string_to_array(p.page_id, '.'), 1) = 2 THEN NULL
        ELSE (
          SELECT string_agg(part, '.' ORDER BY ord)
          FROM unnest((string_to_array(p.page_id, '.'))[1:array_length(string_to_array(p.page_id, '.'), 1)-2])
            WITH ORDINALITY AS t(part, ord)
        )
      END
    ELSE (
      SELECT string_agg(part, '.' ORDER BY ord)
      FROM unnest((string_to_array(p.page_id, '.'))[1:array_length(string_to_array(p.page_id, '.'), 1)-1])
        WITH ORDINALITY AS t(part, ord)
    )
  END
)
WHERE p.parent_page_id IS NULL
  AND array_length(string_to_array(p.page_id, '.'), 1) > 1
  AND NOT (
    split_part(p.page_id, '.', array_length(string_to_array(p.page_id, '.'), 1)) = '0'
    AND array_length(string_to_array(p.page_id, '.'), 1) = 2
  )
  -- Only apply if the simple parent actually exists
  AND EXISTS (
    SELECT 1 FROM pages p2
    WHERE p2.project_id = p.project_id
      AND p2.page_id = CASE
        WHEN split_part(p.page_id, '.', array_length(string_to_array(p.page_id, '.'), 1)) = '0' THEN
          (SELECT string_agg(part, '.' ORDER BY ord)
           FROM unnest((string_to_array(p.page_id, '.'))[1:array_length(string_to_array(p.page_id, '.'), 1)-2])
             WITH ORDINALITY AS t(part, ord))
        ELSE
          (SELECT string_agg(part, '.' ORDER BY ord)
           FROM unnest((string_to_array(p.page_id, '.'))[1:array_length(string_to_array(p.page_id, '.'), 1)-1])
             WITH ORDINALITY AS t(part, ord))
      END
  );
