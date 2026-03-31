-- Add missing DELETE policy for projects table.
-- Without this, RLS silently blocks all project deletions.
CREATE POLICY "Admins can delete projects" ON projects
  FOR DELETE USING (
    has_project_role(auth.uid(), id, ARRAY['admin'])
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_superadmin = TRUE
    )
  );
