/**
 * Extraction Schemas for LlamaExtract
 * 
 * JSON Schema definitions for each document template type.
 * All schemas use PER_DOC extraction target with MULTIMODAL mode.
 */

export type DocumentType = "bank" | "invoice" | "po" | "contract" | "resume";

/**
 * Bank Statement Schema
 * Extracts account details, balances, and transaction history
 */
export const bankStatementSchema = {
  type: "object",
  properties: {
    bank_name: {
      type: "string",
      description: "Name of the issuing bank or financial institution",
    },
    account_number: {
      type: "string",
      description: "Full bank account number",
    },
    account_holder: {
      type: "string",
      description: "Name of the account holder",
    },
    statement_period: {
      type: "object",
      description: "Statement period dates",
      properties: {
        start_date: {
          type: "string",
          description: "Statement period start date in YYYY-MM-DD format",
        },
        end_date: {
          type: "string",
          description: "Statement period end date in YYYY-MM-DD format",
        },
      },
    },
    currency: {
      type: "string",
      description: "Currency code (e.g., THB, USD, EUR)",
    },
    opening_balance: {
      type: "number",
      description: "Opening balance at the start of the statement period",
    },
    closing_balance: {
      type: "number",
      description: "Closing balance at the end of the statement period",
    },
    total_credits: {
      type: "number",
      description: "Total amount of deposits/credits during the period",
    },
    total_debits: {
      type: "number",
      description: "Total amount of withdrawals/debits during the period",
    },
    transactions: {
      type: "array",
      description: "List of all transactions in the statement",
      items: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Transaction date in YYYY-MM-DD format",
          },
          description: {
            type: "string",
            description: "Transaction description or memo",
          },
          reference: {
            type: "string",
            description: "Transaction reference number if available",
          },
          debit: {
            type: "number",
            description: "Debit/withdrawal amount (if applicable)",
          },
          credit: {
            type: "number",
            description: "Credit/deposit amount (if applicable)",
          },
          balance: {
            type: "number",
            description: "Running balance after transaction",
          },
        },
      },
    },
  },
};

/**
 * Invoice Schema
 * Extracts vendor/customer info, line items, and totals
 */
export const invoiceSchema = {
  type: "object",
  properties: {
    invoice_number: {
      type: "string",
      description: "Unique invoice number or ID",
    },
    invoice_date: {
      type: "string",
      description: "Invoice issue date in YYYY-MM-DD format",
    },
    due_date: {
      type: "string",
      description: "Payment due date in YYYY-MM-DD format",
    },
    vendor: {
      type: "object",
      description: "Vendor/seller information",
      properties: {
        name: {
          type: "string",
          description: "Vendor company or business name",
        },
        address: {
          type: "string",
          description: "Vendor full address",
        },
        tax_id: {
          type: "string",
          description: "Vendor tax ID or registration number",
        },
      },
    },
    customer: {
      type: "object",
      description: "Customer/buyer information",
      properties: {
        name: {
          type: "string",
          description: "Customer company or individual name",
        },
        address: {
          type: "string",
          description: "Customer full address",
        },
        tax_id: {
          type: "string",
          description: "Customer tax ID if available",
        },
      },
    },
    line_items: {
      type: "array",
      description: "List of items or services on the invoice",
      items: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Item or service description",
          },
          quantity: {
            type: "number",
            description: "Quantity of items",
          },
          unit_price: {
            type: "number",
            description: "Price per unit",
          },
          amount: {
            type: "number",
            description: "Total amount for this line item",
          },
        },
      },
    },
    subtotal: {
      type: "number",
      description: "Subtotal before tax",
    },
    tax_rate: {
      type: "number",
      description: "Tax rate as a percentage (e.g., 7 for 7%)",
    },
    tax_amount: {
      type: "number",
      description: "Total tax amount",
    },
    total_amount: {
      type: "number",
      description: "Grand total including tax",
    },
    payment_terms: {
      type: "string",
      description: "Payment terms or conditions",
    },
  },
};

/**
 * Purchase Order Schema
 * Extracts buyer/supplier info, order items, and terms
 */
export const purchaseOrderSchema = {
  type: "object",
  properties: {
    po_number: {
      type: "string",
      description: "Purchase order number",
    },
    po_date: {
      type: "string",
      description: "Purchase order date in YYYY-MM-DD format",
    },
    delivery_date: {
      type: "string",
      description: "Expected delivery date in YYYY-MM-DD format",
    },
    buyer: {
      type: "object",
      description: "Buyer/purchaser information",
      properties: {
        company_name: {
          type: "string",
          description: "Buyer company name",
        },
        address: {
          type: "string",
          description: "Buyer address",
        },
        contact_name: {
          type: "string",
          description: "Buyer contact person name",
        },
      },
    },
    supplier: {
      type: "object",
      description: "Supplier/vendor information",
      properties: {
        name: {
          type: "string",
          description: "Supplier company name",
        },
        address: {
          type: "string",
          description: "Supplier address",
        },
      },
    },
    line_items: {
      type: "array",
      description: "List of items being ordered",
      items: {
        type: "object",
        properties: {
          item_code: {
            type: "string",
            description: "Item SKU or product code",
          },
          description: {
            type: "string",
            description: "Item description",
          },
          quantity: {
            type: "number",
            description: "Quantity ordered",
          },
          unit_price: {
            type: "number",
            description: "Price per unit",
          },
          amount: {
            type: "number",
            description: "Total amount for this line item",
          },
        },
      },
    },
    payment_terms: {
      type: "string",
      description: "Payment terms (e.g., Net 30, COD)",
    },
    shipping_method: {
      type: "string",
      description: "Shipping or delivery method",
    },
    total_amount: {
      type: "number",
      description: "Total order amount",
    },
  },
};

/**
 * Contract Schema
 * Extracts parties, dates, key clauses, and terms
 */
export const contractSchema = {
  type: "object",
  properties: {
    contract_title: {
      type: "string",
      description: "Title or name of the contract",
    },
    contract_number: {
      type: "string",
      description: "Contract reference number if available",
    },
    effective_date: {
      type: "string",
      description: "Contract effective/start date in YYYY-MM-DD format",
    },
    expiration_date: {
      type: "string",
      description: "Contract expiration/end date in YYYY-MM-DD format",
    },
    parties: {
      type: "array",
      description: "Parties involved in the contract",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Party name (company or individual)",
          },
          role: {
            type: "string",
            description: "Role in the contract (e.g., Buyer, Seller, Licensor)",
          },
          address: {
            type: "string",
            description: "Party address",
          },
        },
      },
    },
    scope_of_work: {
      type: "string",
      description: "Summary of the scope of work or services covered",
    },
    payment_terms: {
      type: "object",
      description: "Payment terms and conditions",
      properties: {
        total_value: {
          type: "number",
          description: "Total contract value",
        },
        currency: {
          type: "string",
          description: "Currency for payment",
        },
        payment_schedule: {
          type: "string",
          description: "Payment schedule description",
        },
      },
    },
    termination_clause: {
      type: "string",
      description: "Summary of termination conditions",
    },
    governing_law: {
      type: "string",
      description: "Governing law or jurisdiction",
    },
    signatures: {
      type: "array",
      description: "Signature information",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the signatory",
          },
          title: {
            type: "string",
            description: "Title or position of the signatory",
          },
          signature_date: {
            type: "string",
            description: "Date of signature in YYYY-MM-DD format",
          },
        },
      },
    },
  },
};

/**
 * Resume/CV Schema
 * Extracts personal information, work experience, education, skills, and more
 */
export const resumeSchema = {
  type: "object",
  properties: {
    full_name: {
      type: "string",
      description: "Candidate's full name",
    },
    email: {
      type: "string",
      description: "Primary email address",
    },
    phone: {
      type: "string",
      description: "Phone number with country code",
    },
    address: {
      type: "object",
      description: "Location information",
      properties: {
        city: {
          type: "string",
          description: "City name",
        },
        state: {
          type: "string",
          description: "State or province",
        },
        country: {
          type: "string",
          description: "Country name",
        },
        postal_code: {
          type: "string",
          description: "Postal or ZIP code",
        },
      },
    },
    date_of_birth: {
      type: "string",
      description: "Birth date if present in YYYY-MM-DD format",
    },
    nationality: {
      type: "string",
      description: "Nationality or citizenship",
    },
    linkedin_url: {
      type: "string",
      description: "LinkedIn profile URL",
    },
    github_url: {
      type: "string",
      description: "GitHub profile URL",
    },
    portfolio_url: {
      type: "string",
      description: "Portfolio or personal website URL",
    },
    professional_summary: {
      type: "string",
      description: "Summary or objective statement",
    },
    total_years_experience: {
      type: "string",
      description: "Total years of professional experience",
    },
    desired_position: {
      type: "string",
      description: "Target job title or role",
    },
    desired_salary: {
      type: "string",
      description: "Expected salary if mentioned",
    },
    availability: {
      type: "string",
      description: "Notice period or start date availability",
    },
    work_experience: {
      type: "array",
      description: "List of work experience entries",
      items: {
        type: "object",
        properties: {
          company_name: {
            type: "string",
            description: "Employer name",
          },
          job_title: {
            type: "string",
            description: "Position or role title",
          },
          location: {
            type: "string",
            description: "City, country",
          },
          start_date: {
            type: "string",
            description: "Employment start date",
          },
          end_date: {
            type: "string",
            description: "Employment end date or 'Present'",
          },
          employment_type: {
            type: "string",
            description: "Full-time, Part-time, Contract, Intern",
          },
          responsibilities: {
            type: "string",
            description: "Key duties and responsibilities",
          },
          achievements: {
            type: "string",
            description: "Notable accomplishments and metrics",
          },
        },
      },
    },
    education: {
      type: "array",
      description: "List of education entries",
      items: {
        type: "object",
        properties: {
          institution_name: {
            type: "string",
            description: "School or university name",
          },
          degree: {
            type: "string",
            description: "Degree type (Bachelor's, Master's, PhD, etc.)",
          },
          field_of_study: {
            type: "string",
            description: "Major or concentration",
          },
          location: {
            type: "string",
            description: "City, country",
          },
          start_date: {
            type: "string",
            description: "Start date",
          },
          graduation_date: {
            type: "string",
            description: "Graduation or end date",
          },
          gpa: {
            type: "string",
            description: "Grade point average if listed",
          },
          honors: {
            type: "string",
            description: "Honors, awards, distinctions",
          },
        },
      },
    },
    skills: {
      type: "array",
      description: "List of skills",
      items: {
        type: "object",
        properties: {
          skill_name: {
            type: "string",
            description: "Name of the skill",
          },
          category: {
            type: "string",
            description: "Technical, Soft Skill, Tool, Framework",
          },
          proficiency_level: {
            type: "string",
            description: "Expert, Advanced, Intermediate, Beginner",
          },
        },
      },
    },
    certifications: {
      type: "array",
      description: "List of certifications",
      items: {
        type: "object",
        properties: {
          certification_name: {
            type: "string",
            description: "Name of certification",
          },
          issuing_organization: {
            type: "string",
            description: "Certifying body",
          },
          issue_date: {
            type: "string",
            description: "Date obtained",
          },
          expiration_date: {
            type: "string",
            description: "Expiry date if applicable",
          },
          credential_id: {
            type: "string",
            description: "Certificate or credential ID",
          },
        },
      },
    },
    languages: {
      type: "array",
      description: "List of languages",
      items: {
        type: "object",
        properties: {
          language: {
            type: "string",
            description: "Language name",
          },
          proficiency: {
            type: "string",
            description: "Native, Fluent, Intermediate, Basic",
          },
        },
      },
    },
    projects: {
      type: "array",
      description: "List of projects",
      items: {
        type: "object",
        properties: {
          project_name: {
            type: "string",
            description: "Name of project",
          },
          description: {
            type: "string",
            description: "Brief description",
          },
          role: {
            type: "string",
            description: "Role in the project",
          },
          technologies: {
            type: "string",
            description: "Technologies or tools used",
          },
          url: {
            type: "string",
            description: "Project URL if available",
          },
        },
      },
    },
    references: {
      type: "array",
      description: "List of references",
      items: {
        type: "object",
        properties: {
          reference_name: {
            type: "string",
            description: "Name of reference",
          },
          relationship: {
            type: "string",
            description: "Professional relationship",
          },
          company: {
            type: "string",
            description: "Reference's company",
          },
          contact: {
            type: "string",
            description: "Contact information",
          },
        },
      },
    },
  },
};

/**
 * Get the JSON schema for a given document type
 */
export function getSchemaForType(documentType: DocumentType): Record<string, unknown> {
  const schemas: Record<DocumentType, Record<string, unknown>> = {
    bank: bankStatementSchema,
    invoice: invoiceSchema,
    po: purchaseOrderSchema,
    contract: contractSchema,
    resume: resumeSchema,
  };

  const schema = schemas[documentType];
  if (!schema) {
    throw new Error(`Unknown document type: ${documentType}`);
  }

  return schema;
}

/**
 * Get human-readable name for document type
 */
export function getDocumentTypeName(documentType: DocumentType): string {
  const names: Record<DocumentType, string> = {
    bank: "Bank Statement",
    invoice: "Invoice",
    po: "Purchase Order",
    contract: "Contract",
    resume: "Resume / CV",
  };
  return names[documentType] || documentType;
}


