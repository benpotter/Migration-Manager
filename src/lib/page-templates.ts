export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  pages: TemplatePage[];
}

export interface TemplatePage {
  name: string;
  pageStyle?: string;
  children?: TemplatePage[];
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "empty",
    name: "Empty Project",
    description: "Start from scratch with no pages",
    pages: [],
  },
  {
    id: "basic-website",
    name: "Basic Website",
    description: "Simple website with 4 core pages",
    pages: [
      { name: "Home", pageStyle: "Home" },
      { name: "About", pageStyle: "Informational Page - Overview" },
      { name: "Programs", pageStyle: "Top Landing Page" },
      { name: "Contact", pageStyle: "Informational Page - No Sidebar" },
    ],
  },
  {
    id: "academic-program",
    name: "Academic Program",
    description: "Program site with 12 pages across 2 levels",
    pages: [
      {
        name: "Program Overview",
        pageStyle: "Top Landing Page",
        children: [
          { name: "About the Program", pageStyle: "Informational Page - Overview" },
          { name: "Degree Requirements", pageStyle: "Informational Page - Child" },
          { name: "Course Catalog", pageStyle: "Informational Page - Child" },
          { name: "Faculty & Staff", pageStyle: "Informational Page - Child" },
          { name: "Admissions", pageStyle: "Secondary Landing Page" },
          { name: "How to Apply", pageStyle: "Informational Page - Child" },
          { name: "Financial Aid", pageStyle: "Informational Page - Child" },
          { name: "Student Resources", pageStyle: "Secondary Landing Page" },
          { name: "Career Opportunities", pageStyle: "Informational Page - Child" },
          { name: "Contact", pageStyle: "Informational Page - No Sidebar" },
          { name: "FAQ", pageStyle: "Informational Page - Child" },
        ],
      },
    ],
  },
  {
    id: "department-site",
    name: "Department Site",
    description: "Department with 8 pages",
    pages: [
      {
        name: "Department Home",
        pageStyle: "Top Landing Page",
        children: [
          { name: "About Us", pageStyle: "Informational Page - Overview" },
          { name: "Services", pageStyle: "Secondary Landing Page" },
          { name: "Staff Directory", pageStyle: "Informational Page - No Sidebar" },
          { name: "News & Events", pageStyle: "Informational Page - Overview" },
          { name: "Resources", pageStyle: "Secondary Landing Page" },
          { name: "Contact Us", pageStyle: "Informational Page - No Sidebar" },
        ],
      },
    ],
  },
  {
    id: "microsite",
    name: "Microsite",
    description: "Small standalone site with 5 pages",
    pages: [
      { name: "Landing Page", pageStyle: "Microsite" },
      { name: "About", pageStyle: "Microsite" },
      { name: "Details", pageStyle: "Microsite" },
      { name: "Gallery", pageStyle: "Microsite" },
      { name: "Contact", pageStyle: "Microsite" },
    ],
  },
];

/** Flatten a template into a list of pages for creation */
export function flattenTemplate(
  pages: TemplatePage[],
  parentIndex: string | null = null
): { name: string; pageStyle?: string; parentIndex: string | null; index: string }[] {
  const result: { name: string; pageStyle?: string; parentIndex: string | null; index: string }[] = [];
  pages.forEach((page, i) => {
    const index = parentIndex ? `${parentIndex}.${i + 1}` : `${i + 1}`;
    result.push({ name: page.name, pageStyle: page.pageStyle, parentIndex, index });
    if (page.children) {
      result.push(...flattenTemplate(page.children, index));
    }
  });
  return result;
}

/** Count total pages in a template */
export function countTemplatePages(pages: TemplatePage[]): number {
  let count = 0;
  for (const page of pages) {
    count++;
    if (page.children) count += countTemplatePages(page.children);
  }
  return count;
}
