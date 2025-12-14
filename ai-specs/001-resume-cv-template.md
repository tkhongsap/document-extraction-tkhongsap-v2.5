# 001: Resume/CV Extraction Template

**Status:** Implemented ✅
**Created:** 2024-12-14
**Implemented:** 2024-12-14
**Priority:** High
**Purpose:** Demo for recruitment firm client - showcase AI extraction vs traditional OCR

---

## Overview

Add a new "resume" template for extracting structured data from resumes and CVs. This template demonstrates superior extraction accuracy compared to traditional OCR, with 40+ fields across 8 sections.

---

## Schema Design

### Header Fields (Personal Information)

| Field | Type | Description |
|-------|------|-------------|
| `full_name` | string | Candidate's full name |
| `email` | string | Primary email address |
| `phone` | string | Phone number with country code |
| `address` | object | Location (city, state, country, postal_code) |
| `date_of_birth` | string | Birth date if present |
| `nationality` | string | Nationality/citizenship |
| `linkedin_url` | string | LinkedIn profile URL |
| `github_url` | string | GitHub profile URL |
| `portfolio_url` | string | Portfolio/personal website |
| `professional_summary` | string | Summary/objective statement |
| `total_years_experience` | string | Total years of professional experience |
| `desired_position` | string | Target job title/role |
| `desired_salary` | string | Expected salary if mentioned |
| `availability` | string | Notice period/start date availability |

### Array 1: Work Experience (`work_experience`)

| Field | Description |
|-------|-------------|
| `company_name` | Employer name |
| `job_title` | Position/role title |
| `location` | City, country |
| `start_date` | Employment start date |
| `end_date` | Employment end date (or "Present") |
| `employment_type` | Full-time, Part-time, Contract, Intern |
| `responsibilities` | Key duties and responsibilities |
| `achievements` | Notable accomplishments, metrics |

### Array 2: Education (`education`)

| Field | Description |
|-------|-------------|
| `institution_name` | School/university name |
| `degree` | Degree type (Bachelor's, Master's, PhD, etc.) |
| `field_of_study` | Major/concentration |
| `location` | City, country |
| `start_date` | Start date |
| `graduation_date` | Graduation/end date |
| `gpa` | Grade point average if listed |
| `honors` | Honors, awards, distinctions |

### Array 3: Skills (`skills`)

| Field | Description |
|-------|-------------|
| `skill_name` | Name of the skill |
| `category` | Technical, Soft Skill, Tool, Framework |
| `proficiency_level` | Expert, Advanced, Intermediate, Beginner |

### Array 4: Certifications (`certifications`)

| Field | Description |
|-------|-------------|
| `certification_name` | Name of certification |
| `issuing_organization` | Certifying body |
| `issue_date` | Date obtained |
| `expiration_date` | Expiry date if applicable |
| `credential_id` | Certificate/credential ID |

### Array 5: Languages (`languages`)

| Field | Description |
|-------|-------------|
| `language` | Language name |
| `proficiency` | Native, Fluent, Intermediate, Basic |

### Array 6: Projects (`projects`)

| Field | Description |
|-------|-------------|
| `project_name` | Name of project |
| `description` | Brief description |
| `role` | Role in the project |
| `technologies` | Technologies/tools used |
| `url` | Project URL if available |

### Array 7: References (`references`)

| Field | Description |
|-------|-------------|
| `reference_name` | Name of reference |
| `relationship` | Professional relationship |
| `company` | Reference's company |
| `contact` | Contact information |

---

## Files to Modify

### 1. Backend Schema Definition
**File:** `server/extractionSchemas.ts`
- Add `"resume"` to `DocumentType` union type
- Create `resumeSchema` JSON Schema with all fields above
- Update `getSchemaForType()` to include resume
- Update `getDocumentTypeName()` to return "Resume / CV"

### 2. Backend Routes
**File:** `server/routes.ts`
- Add `"resume"` to `validTypes` array in `/api/extract/process` endpoint

### 3. LlamaExtract Service
**File:** `server/llamaExtract.ts`
- Add `resume: "work_experience"` to `getLineItemsKey()` method
- Note: Primary array is work_experience, others handled via extractedData

### 4. Frontend Template Registration
**File:** `client/src/lib/templates.ts`
- Add resume template to `getTemplates()` array:
  - id: `'resume'`
  - icon: `UserCircle` from lucide-react
  - color: `'bg-teal-100 text-teal-600'`
  - border: `'hover:border-teal-200'`

### 5. Frontend API Types
**File:** `client/src/lib/api.ts`
- Add `"resume"` to `DocumentType` union type

### 6. Results Viewer Enhancement
**File:** `client/src/components/StructuredResultsViewer.tsx`

**Major Enhancement Required:** Display multiple collapsible array sections

Changes needed:
- Add `MultiArrayConfig` type for templates with multiple arrays
- Update `getLineItemsConfig()` to return array of configs for resume
- Add state to track expanded sections: `expandedSections: Record<string, boolean>`
- Render loop for multiple array sections
- Handle backward compatibility for existing templates (single array)

**Array Column Definitions:**

| Array | Columns |
|-------|---------|
| `work_experience` | Company, Job Title, Location, Start Date, End Date, Type |
| `education` | Institution, Degree, Field, Graduation Date, GPA |
| `skills` | Skill Name, Category, Proficiency |
| `certifications` | Name, Issuer, Issue Date, Expiry, Credential ID |
| `languages` | Language, Proficiency |
| `projects` | Name, Description, Technologies, URL |
| `references` | Name, Relationship, Company, Contact |

### 7. Internationalization
**File:** `client/src/lib/i18n.ts`
- Add English: `'dash.template_resume': 'Resume / CV'`
- Add Thai: `'dash.template_resume': 'เรซูเม่ / ประวัติย่อ'`

---

## Implementation Order

1. Define schema in `extractionSchemas.ts` (most critical)
2. Update backend routes and LlamaExtract service
3. Register template in frontend `templates.ts`
4. Update API types in `api.ts`
5. **Enhance** StructuredResultsViewer for multi-array display
6. Add translations for bilingual support
7. Test with sample resume PDFs

---

## Demo Value Proposition

| Feature | Traditional OCR | Our AI Extraction |
|---------|-----------------|-------------------|
| Fields extracted | 5-10 basic fields | 40+ detailed fields |
| Nested data | No | Yes (7 array sections) |
| Confidence scores | No | Yes (per-field) |
| Multi-format support | Limited | PDF, images |
| Accuracy | ~70-80% | ~90-95% |
| Thai language | Poor | Native support |

---

## Success Criteria

- [x] Resume template appears in template selection grid
- [x] Upload PDF/image resume extracts all 40+ fields
- [x] All 7 array sections display as collapsible tables
- [x] Confidence scores shown for each field
- [x] Export to JSON/Excel includes all extracted data
- [x] Works with both English and Thai resumes

---

## Implementation Notes

**Implemented by:** Development Team
**Reviewed by:** Claude Code
**Branch:** `feature/cv-extraction`

### Files Modified
1. `server/extractionSchemas.ts` - Added `resumeSchema` with 40+ fields
2. `server/routes.ts` - Added `"resume"` to validTypes array
3. `server/llamaExtract.ts` - Added multi-array handling for resume
4. `client/src/lib/templates.ts` - Registered template with teal styling
5. `client/src/lib/api.ts` - Added to DocumentType union
6. `client/src/components/StructuredResultsViewer.tsx` - Enhanced for 7 collapsible sections
7. `client/src/lib/i18n.ts` - Added EN/TH translations
