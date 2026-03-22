-- Add explicit FK from project_members.user_id to user_profiles.id
-- so PostgREST can resolve the embedded select join path unambiguously.
ALTER TABLE project_members
  ADD CONSTRAINT project_members_user_profile_fk
  FOREIGN KEY (user_id) REFERENCES user_profiles(id);
