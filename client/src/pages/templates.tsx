import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { getTemplates } from "@/lib/templates";

export default function Templates() {
  const { t } = useLanguage();
  const templates = getTemplates(t);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.templates')}</h1>
        <p className="text-muted-foreground">Select a template to start extracting data</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Link key={template.id} href={`/extraction/${template.id}`}>
            <Card className={`h-full transition-all cursor-pointer hover:shadow-md border-2 border-transparent ${template.border}`}>
              <CardContent className="p-6 flex flex-col gap-4">
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${template.color}`}>
                  <template.icon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
