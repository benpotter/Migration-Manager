-- Allow superadmins to update any user profile (e.g. role changes from /admin/users).
-- The existing policy only allows users to update their own profile.
CREATE POLICY "Superadmins can update any profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_superadmin = TRUE
    )
  );
