import { Receipt, FileSpreadsheet, ScrollText, Landmark, FileText, LucideIcon } from "lucide-react";
import { useLanguage } from "./i18n";

export interface Template {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  border?: string;
}

export function getTemplates(t: (key: string) => string): Template[] {
  return [
    { 
      id: 'bank', 
      name: t('dash.template_bank'), 
      desc: 'Extract transactions, balances, and account details', 
      icon: Landmark, 
      color: 'bg-blue-100 text-blue-600', 
      border: 'hover:border-blue-200' 
    },
    { 
      id: 'invoice', 
      name: t('dash.template_invoice'), 
      desc: 'Extract vendor, line items, taxes, and totals', 
      icon: Receipt, 
      color: 'bg-green-100 text-green-600', 
      border: 'hover:border-green-200' 
    },
    { 
      id: 'po', 
      name: t('dash.template_po'), 
      desc: 'Extract order details, items, and shipping info', 
      icon: FileSpreadsheet, 
      color: 'bg-purple-100 text-purple-600', 
      border: 'hover:border-purple-200' 
    },
    { 
      id: 'contract', 
      name: t('dash.template_contract'), 
      desc: 'Extract parties, dates, and key clauses', 
      icon: ScrollText, 
      color: 'bg-orange-100 text-orange-600', 
      border: 'hover:border-orange-200' 
    },
    { 
      id: 'general', 
      name: t('nav.general'), 
      desc: 'AI-powered extraction for any document type', 
      icon: FileText, 
      color: 'bg-slate-100 text-slate-600', 
      border: 'hover:border-slate-200' 
    },
  ];
}

export function getTemplateById(id: string, t: (key: string) => string): Template | undefined {
  return getTemplates(t).find(template => template.id === id);
}




