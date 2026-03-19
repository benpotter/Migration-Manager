-- Add missing Educación Infantil pages (1.1.6.21 and children)
INSERT INTO pages (page_id, name, slug, page_style, content_responsibility, content_author, migration_owner, migrator, status, parent_page_id, depth, sort_order)
VALUES
  ('1.1.6.21', 'Educación Infantil', '/degrees-and-programs/degrees-and-certificates/social-and-behavioral-science-education-pathway/educacion-infantil', 'Informational Page - Overview', 'RCC', 'kgonzales@roguecc.edu', 'RCC', 'thenschel@roguecc.edu', 'migration_in_progress', '1.1.6', 4, 1451),
  ('1.1.6.21.1', 'Prerequisites & Requirements', '/degrees-and-programs/degrees-and-certificates/social-and-behavioral-science-education-pathway/educacion-infantil/prerequisites-and-requirements', 'Informational Page - Child', 'RCC', NULL, 'RCC', 'thenschel@roguecc.edu', 'migration_in_progress', '1.1.6.21', 5, 1452),
  ('1.1.6.21.2', 'Application Process', '/degrees-and-programs/degrees-and-certificates/social-and-behavioral-science-education-pathway/educacion-infantil/application-process', 'Informational Page - Child', 'RCC', NULL, 'RCC', 'thenschel@roguecc.edu', 'migration_in_progress', '1.1.6.21', 5, 1453),
  ('1.1.6.21.3', 'Career & Salary Outlook', '/degrees-and-programs/degrees-and-certificates/social-and-behavioral-science-education-pathway/educacion-infantil/career-and-salary-outlook', 'Informational Page - Child', 'RCC', NULL, 'RCC', 'thenschel@roguecc.edu', 'migration_in_progress', '1.1.6.21', 5, 1454)
ON CONFLICT (page_id) DO NOTHING;
